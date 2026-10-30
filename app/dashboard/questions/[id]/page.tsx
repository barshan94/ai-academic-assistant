import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateQuestionSolution, reviewQuestionSolution, createQuestionTeacherInvite, revokeQuestionTeacherInvite } from "./actions";
import { checkCalculations } from "@/lib/ai/math-check";
import { checkChemicalEquations } from "@/lib/ai/chemistry-check";
import { checkPhysicsUnits } from "@/lib/ai/physics-unit-check";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { examAnswerSchema } from "@/lib/ai/answer-schema";
import { ClassificationForm } from "./classification-form";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ solve?: string; solution?: string; review?: string; invite?: string; classification?: string }>;
};

const messages: Record<string, string> = {
  generated: "An AI-generated answer was saved. It has not been independently verified.",
  not_configured: "AI solving is not configured. Add an AI provider key and model to the server environment before generating answers.",
  needs_review: "Approve this question in your question library before generating an answer.",
  save_failed: "The answer was generated but could not be saved. Check the database migration and try again.",
  AI_PROVIDER_UNAVAILABLE: "The AI provider could not be reached. Try again later.",
  AI_PROVIDER_INVALID_RESPONSE: "The AI provider returned an unreadable response.",
  AI_PROVIDER_INVALID_STRUCTURED_ANSWER: "The AI provider returned an answer that did not pass the required structure checks.",
  AI_PROVIDER_EMPTY_RESPONSE: "The AI provider returned an empty answer.",
};

export default async function QuestionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: question, error } = await supabase.from("questions")
    .select("id,owner_id,question_text,question_number,board,qualification,subject,syllabus_version,chapter,topic,classification_status,classification_confidence,review_status,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !question) notFound();

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: solutions, error: solutionError } = await typedSupabase.from("question_solutions")
    .select("id,owner_id,provider,model,prompt_version,answer_json,verification_status,created_at")
    .eq("question_id", question.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const latest = solutions?.[0];
  const selectedSolution = query.solution
    ? solutions?.find((item) => item.id === query.solution)
    : latest;
  const parsedAnswer = selectedSolution
    ? examAnswerSchema.safeParse(selectedSolution.answer_json)
    : undefined;
  const answer = parsedAnswer?.success ? parsedAnswer.data : undefined;
  const storedAnswerInvalid = Boolean(selectedSolution && !parsedAnswer?.success);
  const requestedSolutionMissing = Boolean(query.solution && !selectedSolution);
  const calculationChecks = Array.isArray(answer?.calculationChecks) ? answer.calculationChecks : [];
  const chemistryChecks = Array.isArray(answer?.chemistryChecks) ? answer.chemistryChecks : [];
  const physicsChecks = Array.isArray(answer?.physicsChecks) ? answer.physicsChecks : [];
  const arithmeticResults = checkCalculations(calculationChecks);
  const arithmeticPassed = arithmeticResults.length > 0 && arithmeticResults.every((item) => item.status === "passed");
  const chemistryResults = checkChemicalEquations(chemistryChecks);
  const chemistryPassed = chemistryResults.length > 0 && chemistryResults.every((item) => item.status === "balanced");
  const physicsResults = checkPhysicsUnits(physicsChecks);
  const physicsPassed = physicsResults.length > 0 && physicsResults.every((item) => item.status === "dimensionally_consistent");
  const { data: reviews, error: reviewError } = selectedSolution
    ? await typedSupabase.from("question_solution_reviews")
        .select("id,owner_id,reviewer_id,decision,correction_notes,created_at")
        .eq("solution_id", selectedSolution.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [], error: null };
  const isOwner = question.owner_id === user.id;
  const { data: teacherInvites, error: teacherInviteError } = isOwner
    ? await typedSupabase.from("question_teacher_invites").select("id,invited_email,accepted_by,revoked_at,created_at").eq("question_id", question.id).eq("owner_id", user.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  const message = query.invite === "created" ? "Invitation created. The teacher must sign in with this exact email address and accept it from Teacher invitations."
    : query.invite === "accepted" ? "Teacher access accepted. You can now review the shared question and saved answers."
    : query.invite === "revoked" ? "Teacher access has been revoked."
    : query.invite === "exists" ? "An active invitation for this email and question already exists."
    : query.invite === "self" ? "You cannot invite your own account as a teacher."
    : query.invite === "save_failed" || query.invite === "revoke_failed" ? "The invitation could not be saved. Please try again."
    : query.invite === "invalid" || query.invite === "not_found" ? "The invitation details were invalid or the question was not found."
    : query.solve
    ? messages[query.solve] ?? "Answer generation failed (" + query.solve.slice(0, 80) + ")."
    : query.review === "approved" ? "Your review was saved under your account. It is recorded separately from other reviewers."
    : query.review === "needs_correction" ? "Correction feedback was saved in the review history."
    : query.review === "save_failed" ? "The review could not be saved. Please retry."
    : query.review === "notes_required" ? "Please add correction notes when marking an answer as needing correction."
    : query.review === "invalid" ? "The review details were invalid. Check the decision and try again."
    : query.review === "not_found" ? "The selected answer draft could not be found."
    : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/teacher-invites">Teacher invitations</Link><Link className="sign-in-link" href="/dashboard/questions">Question bank</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">ACADEMIC SOLVER · M3</p>
        <h1>Question <span>workspace.</span></h1>
        <p className="hero-copy">Generate an examination-style answer with Bengali and English teaching explanations. Generated answers are drafts, not verified mark-scheme solutions.</p>
      </section>
      {message ? <p className="notice notice-info" role="status">{message}</p> : null}
      {query.classification === "saved" ? <p className="notice notice-info" role="status">Syllabus classification saved.</p> : null}
      {query.classification === "incomplete" ? <p className="notice notice-error" role="alert">A confirmed classification requires board, qualification, subject and syllabus version.</p> : null}
      {query.classification === "save_failed" || query.classification === "invalid" ? <p className="notice notice-error" role="alert">The syllabus classification could not be saved. Check the fields and try again.</p> : null}
      {solutionError ? <p className="notice notice-error">Could not load saved answers.</p> : null}
      {reviewError ? <p className="notice notice-error">Could not load review history.</p> : null}
      {teacherInviteError ? <p className="notice notice-error">Could not load teacher invitations.</p> : null}
      {requestedSolutionMissing ? <p className="notice notice-info">That saved draft is not in the available history. Showing the latest saved draft instead.</p> : null}
      {storedAnswerInvalid ? <p className="notice notice-error">This saved response does not match the current answer format and cannot be displayed safely.</p> : null}
      <section className="section">
        <article className="question-card">
          <div className="question-card-heading">
            <span className="document-status">{question.review_status.replace("_", " ")}</span>
            <span className="question-subject">{question.subject ?? "Subject not set"}</span>
          </div>
          <p className="question-card-text">{question.question_number ? question.question_number + ". " : ""}{question.question_text}</p>
          <p className="question-card-meta">{[question.board, question.qualification, question.syllabus_version, question.chapter, question.topic].filter(Boolean).join(" · ") || "Syllabus metadata not set"} · Mapping: {question.classification_status.replace("_", " ")}</p>
          {isOwner && question.review_status === "approved" ? (
            <form action={generateQuestionSolution}>
              <input type="hidden" name="questionId" value={question.id} />
              <button className="primary-action" type="submit">Generate AI answer <span aria-hidden="true">→</span></button>
              <p className="question-card-meta">This action sends the question to your configured AI provider and may incur provider charges.</p>
            </form>
           ) : isOwner ? <p className="notice notice-info">This question needs teacher approval before it can be sent to the AI provider.</p> : <p className="notice notice-info">You have review access only. AI generation and question editing remain with the owner.</p>}
        </article>
        {isOwner ? (
          <div className="classification-panel">
            <p className="eyebrow">SYLLABUS INTELLIGENCE · M5</p>
            <h2>Review syllabus classification</h2>
            <p className="question-card-meta">Record the exact syllabus specification and mark uncertain mappings for later checking. Classification review is separate from question-content approval.</p>
            <ClassificationForm question={question} />
          </div>
        ) : (
          <p className="question-card-meta">Syllabus mapping: {question.classification_status.replace("_", " ")} · Version: {question.syllabus_version ?? "Not recorded"}</p>
        )}
      </section>
      {isOwner ? (
        <section className="section">
          <p className="eyebrow">INDEPENDENT TEACHER REVIEW</p>
          <h2>Share this question with a teacher</h2>
          <p className="question-card-meta">The invited person must already have an Academic Assistant account using this exact email address. No email is sent automatically; the invitation appears in their Teacher invitations page after they sign in.</p>
          <form action={createQuestionTeacherInvite} className="review-form">
            <input type="hidden" name="questionId" value={question.id} />
            <label htmlFor="teacher-email">Teacher account email</label>
            <input id="teacher-email" name="email" type="email" required maxLength={320} placeholder="teacher@example.com" />
            <button className="primary-action" type="submit">Create teacher invitation →</button>
          </form>
          {teacherInvites?.length ? <><h3>Access list</h3><ul className="calculation-checks">
            {teacherInvites.map((invite) => <li key={invite.id}>
              <strong>{invite.revoked_at ? "REVOKED" : invite.accepted_by ? "ACCEPTED" : "PENDING"}</strong><span>{invite.invited_email}</span>
              {!invite.revoked_at ? <form action={revokeQuestionTeacherInvite}>
                <input type="hidden" name="inviteId" value={invite.id} />
                <input type="hidden" name="questionId" value={question.id} />
                <button className="secondary-action" type="submit">Revoke access</button>
              </form> : null}
            </li>)}
          </ul></> : null}
        </section>
      ) : <p className="notice notice-info">Shared with you for independent review. You can read saved answers and submit review feedback, but cannot edit the owner&apos;s question or generate new answers.</p>}
      {answer ? (
        <section className="section">
          <div className="section-heading"><div><p className="eyebrow">SELECTED SAVED RESPONSE</p><h2>Answer draft</h2></div><span className="document-status">{selectedSolution?.verification_status.replace("_", " ")}</span></div>
          <article className="solution-panel">
            <p className="eyebrow">EXAM-READY ANSWER</p>
            <div className="solution-prose">{answer.examAnswer}</div>
            {answer.workingSteps.length ? <>
              <h3>Working and reasoning</h3>
              <ol className="solution-steps">{answer.workingSteps.map((step, index) => <li key={index}><strong>{step.step}</strong><p>{step.explanation}</p></li>)}</ol>
            </> : null}
            {calculationChecks.length ? <>
              <h3>Arithmetic consistency checks</h3>
              <p className="question-card-meta">These checks recalculate only the supplied arithmetic expressions. They do not verify the physics, chemistry, algebraic modelling, units or exam-method correctness.</p>
              <ul className="calculation-checks">{arithmeticResults.map((item, index) => (
                <li key={index}>
                  <strong>{item.status === "passed" ? "PASS" : item.status === "mismatch" ? "MISMATCH" : "NOT CHECKED"}</strong>
                  <span><code>{item.expression}</code> = {item.calculatedResult === null ? "not calculated" : item.calculatedResult} {item.unit}</span>
                  <small>{item.message} Claimed result: {item.claimedResult} {item.unit}</small>
                </li>
              ))}</ul>
              {arithmeticPassed ? <p className="notice notice-info">All supplied arithmetic expressions passed. This is not an overall answer verification.</p> : <p className="notice notice-info">At least one arithmetic expression did not pass or could not be checked. Review the calculations manually.</p>}
            </> : null}
            {chemistryChecks.length ? <>
              <h3>Chemical equation balance checks</h3>
              <p className="question-card-meta">Checks atom counts for ordinary neutral formulae and simple reaction notation. Ionic charges, hydrates and advanced notation are deliberately marked unsupported rather than guessed.</p>
              <ul className="calculation-checks">{chemistryResults.map((item, index) => (
                <li key={index}>
                  <strong>{item.status === "balanced" ? "BALANCED" : item.status === "unbalanced" ? "UNBALANCED" : item.status === "claim_mismatch" ? "CLAIM MISMATCH" : "NOT CHECKED"}</strong>
                  <span><code>{item.equation}</code></span>
                  {Object.keys(item.atomCounts).length ? <span>{Object.entries(item.atomCounts).map(([element, count]) => element + ": " + count.left + " → " + count.right).join(" · ")}</span> : null}
                  <small>{item.message}</small>
                </li>
              ))}</ul>
              {chemistryPassed ? <p className="notice notice-info">All submitted equations passed the supported atom-count check. This does not verify reaction conditions, products or chemical feasibility.</p> : <p className="notice notice-info">At least one equation was unbalanced, misreported or unsupported. Review it manually.</p>}
            </> : null}
            {physicsChecks.length ? <>
              <h3>Physics dimensional checks</h3>
              <p className="question-card-meta">Compares the dimensions of the supplied formula unit with the claimed answer unit. It does not prove that the formula or substitution is physically correct.</p>
              <ul className="calculation-checks">{physicsResults.map((item, index) => (
                <li key={index}>
                  <strong>{item.status === "dimensionally_consistent" ? "DIMENSIONS MATCH" : item.status === "dimension_mismatch" ? "DIMENSION MISMATCH" : "NOT CHECKED"}</strong>
                  <span><code>{item.formulaUnit}</code> → <code>{item.claimedUnit}</code></span>
                  <small>{item.message}</small>
                </li>
              ))}</ul>
              {physicsPassed ? <p className="notice notice-info">All submitted dimensional checks matched. This is not a complete physics verification.</p> : <p className="notice notice-info">At least one dimensional check did not match or could not be checked. Review it manually.</p>}
            </> : null}
            <h3>Bengali explanation</h3><div className="solution-prose" lang="bn">{answer.bengaliExplanation}</div>
            <h3>English explanation</h3><div className="solution-prose">{answer.englishExplanation}</div>
            {answer.keyConcepts.length ? <><h3>Key concepts</h3><ul>{answer.keyConcepts.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {answer.assumptions.length ? <><h3>Assumptions</h3><ul>{answer.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {answer.limitations.length ? <><h3>Limitations</h3><ul>{answer.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            <p className="question-card-meta">Provider: {selectedSolution?.provider} · Model: {selectedSolution?.model} · Prompt: {selectedSolution?.prompt_version}</p>
            <p className="notice notice-info">AI-generated draft. Review feedback is recorded separately and does not alter this answer. A teacher review is independent of the owner review, but it is not an official exam-board mark scheme.</p>
            <section className="section">
              <p className="eyebrow">REVIEW & CORRECTION LOG</p>
              <h3>Record your review</h3>
              <form action={reviewQuestionSolution} className="review-form">
                <input type="hidden" name="solutionId" value={selectedSolution?.id ?? ""} />
                <label htmlFor="review-decision">Review decision</label>
                <select id="review-decision" name="decision" defaultValue="approved">
                  <option value="approved">Reviewed — acceptable as a draft</option>
                  <option value="needs_correction">Needs correction</option>
                </select>
                <label htmlFor="review-notes">Correction notes (required when corrections are needed)</label>
                <textarea id="review-notes" name="correctionNotes" rows={4} maxLength={5000} placeholder="Explain the error, corrected method, missing mark points, or syllabus issue." />
                <button className="primary-action" type="submit">Save review record →</button>
              </form>
              <p className="question-card-meta">Reviews are append-only records tied to the reviewer account. They do not alter the original AI answer. The owner can see all reviews; a teacher can see their own review records.</p>
              <h3>Review history</h3>
              {reviews && reviews.length ? (
                <ul className="calculation-checks">
                  {reviews.map((review) => (
                    <li key={review.id}>
                      <strong>{review.reviewer_id === review.owner_id ? "OWNER REVIEW: ACCEPTABLE DRAFT" : review.decision === "approved" ? "TEACHER REVIEW: ACCEPTABLE DRAFT" : "TEACHER REQUESTED CORRECTIONS"}</strong>
                      <span>{new Date(review.created_at).toLocaleString()} · {review.reviewer_id === review.owner_id ? "Owner review" : "Independent teacher account"}</span>
                      {review.correction_notes ? <small>{review.correction_notes}</small> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="question-card-meta">No review records yet.</p>}
            </section>
          </article>
        </section>
      ) : null}
      {solutions && solutions.length > 0 ? (
        <section className="section">
          <div className="section-heading"><div><p className="eyebrow">VERSION HISTORY</p><h2>Saved answer drafts</h2></div><span className="document-status">{solutions.length} shown</span></div>
          <ul className="calculation-checks">
            {solutions.map((item) => (
              <li key={item.id}>
                <strong>{item.id === selectedSolution?.id ? "CURRENTLY VIEWING" : "SAVED DRAFT"}</strong>
                <span>{new Date(item.created_at).toLocaleString()} · {item.provider} / {item.model}</span>
                <small>{item.verification_status.replace("_", " ")}</small>
                {item.id === selectedSolution?.id
                  ? <span className="question-card-meta">This version is currently open.</span>
                  : <Link className="sign-in-link" href={"/dashboard/questions/" + question.id + "?solution=" + item.id}>Open this version →</Link>}
              </li>
            ))}
          </ul>
          <p className="question-card-meta">Showing the latest 20 saved versions. Generating another answer creates a new draft; it does not overwrite earlier versions.</p>
        </section>
      ) : null}
    </main>
  );
}
