import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateQuestionSolution, reviewQuestionSolution, createQuestionTeacherInvite, revokeQuestionTeacherInvite, searchQuestionWebSources } from "./actions";
import { checkCalculations } from "@/lib/ai/math-check";
import { checkChemicalEquations } from "@/lib/ai/chemistry-check";
import { checkPhysicsUnits } from "@/lib/ai/physics-unit-check";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { examAnswerSchema } from "@/lib/ai/answer-schema";
import { compareAnswerToMarkScheme, markSchemeSchema } from "@/lib/ai/mark-scheme";
import { ClassificationForm } from "./classification-form";
import { MarkSchemeEditor } from "./mark-scheme-editor";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ solve?: string; solution?: string; review?: string; invite?: string; classification?: string; mark_scheme?: string; research?: string }>;
};

const messages: Record<string, string> = {
  generated: "An AI-generated answer was saved. It has not been independently verified.",
  rate_limited: "You have reached the AI answer-generation limit. Wait 15 minutes before trying again.",
  rate_limit_unavailable: "AI generation is temporarily blocked because the account quota service is unavailable. No provider request was sent.",
  source_unavailable: "The original source page is unavailable to this account, so no source text was sent.",
  source_empty: "The selected source page has no usable extracted text. Correct or re-extract the page before opting in.",
  not_configured: "AI solving is not configured. Add an AI provider key and model to the server environment before generating answers.",
  needs_review: "Approve this question in your question library before generating an answer.",
  knowledge_unavailable: "No approved chapter notes are available for this question\u2019s confirmed syllabus chapter, or their content could not be prepared.",
  KNOWLEDGE_CONTEXT_INVALID: "The selected chapter-note context could not be prepared safely. Review the notes and try again.",
  save_failed: "The answer was generated but could not be saved. Check the database migration and try again.",
  AI_PROVIDER_UNAVAILABLE: "The AI provider could not be reached. Try again later.",
  AI_PROVIDER_INVALID_RESPONSE: "The AI provider returned an unreadable response.",
  AI_PROVIDER_INVALID_STRUCTURED_ANSWER: "The AI provider returned an answer that did not pass the required structure checks.",
  AI_PROVIDER_EMPTY_RESPONSE: "The AI provider returned an empty answer.",
};


function classificationSummary(state: Json | null): string {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "No earlier classification";
  const values = state as { [key: string]: Json | undefined };
  const parts = [
    values.board,
    values.qualification,
    values.subject,
    values.syllabus_version,
    values.chapter,
    values.topic,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const status = values.classification_status;
  if (typeof status === "string") parts.push("Status: " + status.replace("_", " "));
  return parts.length ? parts.join(" · ") : "No syllabus labels recorded";
}

function knowledgeProvenanceSummary(value: Json | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as { [key: string]: Json | undefined };
    if (typeof record.note_id !== "string" || typeof record.version_number !== "number" || typeof record.title !== "string") return [];
    return [record.title + " · Version " + record.version_number + " · " + record.note_id.slice(0, 8)];
  });
}

function sourceProvenanceSummary(value: Json | null): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as { [key: string]: Json | undefined };
  const name = metadata.document_name;
  const page = metadata.page_number;
  const method = metadata.extraction_method;
  const length = metadata.excerpt_length;
  const hash = metadata.excerpt_sha256;
  if (typeof name !== "string" || typeof page !== "number" || typeof method !== "string" || typeof length !== "number" || typeof hash !== "string") return null;
  return name + " · Page " + page + " · " + method + " · " + length + " characters · SHA-256 " + hash.slice(0, 16) + "…";
}

export default async function QuestionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: question, error } = await supabase.from("questions")
    .select("id,owner_id,question_text,question_number,board,qualification,subject,syllabus_version,chapter,topic,syllabus_catalog_id,syllabus_chapter_id,syllabus_topic_id,classification_status,classification_confidence,review_status,document_page_id,document_id,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !question) notFound();

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: solutions, error: solutionError } = await typedSupabase.from("question_solutions")
    .select("id,owner_id,provider,model,prompt_version,answer_json,source_context,knowledge_sources,verification_status,created_at")
    .eq("question_id", question.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const latest = solutions?.[0];
  const selectedSolution = query.solution
    ? solutions?.find((item) => item.id === query.solution)
    : latest;
  const { data: savedMarkSchemes, error: markSchemeError } = selectedSolution
    ? await typedSupabase.from("question_solution_mark_schemes")
        .select("id,title,awarding_body,qualification,subject,paper_reference,source_url,source_locator,source_document_version,points,created_at")
        .eq("solution_id", selectedSolution.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [], error: null };
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
  const { data: approvedChapterNotes, error: approvedChapterNotesError } = isOwner &&
    question.syllabus_chapter_id && question.classification_status === "confirmed"
    ? await supabase.from("chapter_note_versions")
        .select("id,title,version_number")
        .eq("owner_id", user.id)
        .eq("chapter_id", question.syllabus_chapter_id)
        .eq("status", "approved")
        .order("version_number", { ascending: false })
        .limit(3)
    : { data: [], error: null };
  const { data: sourcePage } = isOwner && question.document_page_id
    ? await supabase.from("document_pages").select("id,page_number,extracted_text,extraction_method,status").eq("id", question.document_page_id).eq("document_id", question.document_id).eq("owner_id", user.id).maybeSingle()
    : { data: null };
  const { data: classificationHistory, error: classificationHistoryError } = isOwner
    ? await typedSupabase.from("question_classification_history")
        .select("id,event_type,previous_state,new_state,changed_at,changed_by")
        .eq("question_id", question.id)
        .eq("owner_id", user.id)
        .order("changed_at", { ascending: false })
        .limit(30)
    : { data: [], error: null };
  const { data: syllabusCatalogs } = isOwner
    ? await supabase.from("syllabus_catalogs").select("id,board,qualification,subject,version,status,source_url,source_title,source_checked_at").eq("owner_id", user.id).order("created_at", { ascending: false })
    : { data: [] };
  const syllabusCatalogIds = (syllabusCatalogs ?? []).map((item) => item.id);
  const { data: syllabusChapters } = isOwner && syllabusCatalogIds.length
    ? await supabase.from("syllabus_chapters").select("id,catalog_id,title,chapter_code").eq("owner_id", user.id).in("catalog_id", syllabusCatalogIds).order("sort_order").order("title")
    : { data: [] };
  const syllabusChapterIds = (syllabusChapters ?? []).map((item) => item.id);
  const { data: syllabusTopics } = isOwner && syllabusChapterIds.length
    ? await supabase.from("syllabus_topics").select("id,chapter_id,title,topic_code").eq("owner_id", user.id).in("chapter_id", syllabusChapterIds).order("sort_order").order("title")
    : { data: [] };
  const { data: syllabusEvidence } = isOwner && syllabusChapterIds.length
    ? await supabase.from("syllabus_reference_evidence")
      .select("id,catalog_id,chapter_id,topic_id,source_url,source_title,source_locator,evidence_excerpt,created_at")
      .eq("owner_id", user.id).in("chapter_id", syllabusChapterIds).order("created_at", { ascending: false })
    : { data: [] };
  const { data: teacherInvites, error: teacherInviteError } = isOwner
    ? await typedSupabase.from("question_teacher_invites").select("id,invited_email,accepted_by,revoked_at,created_at").eq("question_id", question.id).eq("owner_id", user.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  const { data: researchSources, error: researchError } = isOwner
    ? await typedSupabase.from("question_web_research_sources")
        .select("id,query,provider,title,source_url,snippet,result_rank,published_at,retrieved_at")
        .eq("question_id", question.id).eq("owner_id", user.id)
        .order("retrieved_at", { ascending: false }).order("result_rank").limit(30)
    : { data: [], error: null };
  const message = query.research === "saved" ? "Web search results were saved as unverified source leads. Check each publisher and document before relying on it."
    : query.research === "not_configured" ? "Web research is not configured. Add an approved Brave Search API key to the server environment."
    : query.research === "rate_limited" ? "You have reached the web research limit. Wait for the next 15-minute window or the next UTC day before searching again."
    : query.research === "quota_unavailable" ? "Web research is temporarily blocked because the account quota service is unavailable. No search request was sent."
    : query.research === "no_results" ? "The search provider returned no usable HTTPS sources for that query."
    : query.research === "save_failed" ? "Search results were retrieved but could not be saved to the question record."
    : query.research === "invalid" ? "Enter a search query between 3 and 500 characters."
    : query.research === "not_found" ? "The question was not found in your account."
    : query.research?.startsWith("WEB_RESEARCH_HTTP_") ? "The web search provider is temporarily unavailable."
    : query.research ? "Web research could not be completed. Try again later."
    : query.invite === "created" ? "Invitation created. The teacher must sign in with this exact email address and accept it from Teacher invitations."
    : query.invite === "accepted" ? "Teacher access accepted. You can now review the shared question and saved answers."
    : query.invite === "revoked" ? "Teacher access has been revoked."
    : query.invite === "exists" ? "An active invitation for this email and question already exists."
    : query.invite === "self" ? "You cannot invite your own account as a teacher."
    : query.invite === "save_failed" || query.invite === "revoke_failed" ? "The invitation could not be saved. Please try again."
    : query.invite === "invalid" || query.invite === "not_found" ? "The invitation details were invalid or the question was not found."
    : query.mark_scheme === "saved" ? "Mark scheme reference saved. The comparison below is a phrase-presence checklist, not a mark award."
    : query.mark_scheme === "save_failed" ? "The mark scheme could not be saved. Check the migration and supplied fields."
    : query.mark_scheme === "invalid_json" ? "Mark points must be valid JSON."
    : query.mark_scheme === "invalid" ? "The mark scheme fields or point structure are invalid."
    : query.mark_scheme === "not_found" ? "The selected saved answer was not found in your account."
    : query.solve
    ? messages[query.solve] ?? "Answer generation failed (" + query.solve.slice(0, 80) + ")."
    : query.review === "approved" ? (isOwner
      ? "Your owner review was saved separately. Owner approval does not mark an answer as teacher-verified."
      : "Your independent teacher review was saved. The answer is now marked teacher-verified.")
    : query.review === "needs_correction" ? (isOwner
      ? "Your owner correction review was saved in the review history."
      : "Teacher correction feedback was saved. Any teacher-verified label has been removed until a later approved review.")
    : query.review === "save_failed" ? "The review could not be saved. Please retry."
    : query.review === "notes_required" ? "Please add correction notes when marking an answer as needing correction."
    : query.review === "invalid" ? "The review details were invalid. Check the decision and try again."
    : query.review === "not_found" ? "The selected answer draft could not be found."
    : query.review === "not_authorized" ? "An active, accepted teacher invitation is required to submit an independent teacher review."
    : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/teacher-invites">Teacher invitations</Link><Link className="sign-in-link" href="/dashboard/questions">Question bank</Link><Link className="sign-in-link" href="/dashboard/syllabus">Syllabus catalogue</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">ACADEMIC SOLVER · M3</p>
        <h1>Question <span>workspace.</span></h1>
        <p className="hero-copy">Generate an examination-style answer with Bengali and English teaching explanations. Generated answers are drafts, not verified mark-scheme solutions.</p>
      </section>
      {message ? <p className="notice notice-info" role="status">{message}</p> : null}
      {query.classification === "saved" ? <p className="notice notice-info" role="status">Syllabus classification saved.</p> : null}
      {query.classification === "incomplete" ? <p className="notice notice-error" role="alert">A confirmed classification requires board, qualification, subject and syllabus version.</p> : null}
      {query.classification === "save_failed" || query.classification === "invalid" || query.classification === "reference_not_found" || query.classification === "reference_mismatch" ? <p className="notice notice-error" role="alert">The syllabus classification could not be saved. Check the selected catalogue, chapter and topic, then try again.</p> : null}
      {query.classification === "catalog_unverified" ? <p className="notice notice-error" role="alert">Verify this syllabus version with an official source before confirming a question mapping.</p> : null}
      {query.classification === "evidence_required" ? <p className="notice notice-error" role="alert">Record a source citation for the selected chapter or topic in the Syllabus catalogue before confirming this structured mapping. A citation is owner-recorded, not independently certified by the app.</p> : null}
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
            <form action={generateQuestionSolution} className="review-form">
              <input type="hidden" name="questionId" value={question.id} />
              {sourcePage?.extracted_text?.trim() ? <div className="source-context-option">
                <label><input type="checkbox" name="includeSourceContext" value="yes" /> Also send the original source page text to the AI provider</label>
                <p className="question-card-meta">Optional. Only this page is shared, trimmed to 8,000 characters. Extraction method: {sourcePage.extraction_method ?? "unknown"}; page {sourcePage.page_number}. OCR and PDF extraction can contain mistakes. This text is not an official mark scheme.</p>
                <details><summary>Preview the text that may be shared</summary><pre className="solution-prose">{sourcePage.extracted_text.trim().slice(0, 8000)}</pre></details>
              </div> : <p className="question-card-meta">No usable extracted source page is linked to this question. You can still generate an answer without source text.</p>}
              {approvedChapterNotes?.length ? <div className="source-context-option">
                <label><input type="checkbox" name="includeKnowledgeContext" value="yes" /> Include up to three approved notes from this exact syllabus chapter</label>
                <p className="question-card-meta">Only approved versions owned by you and linked to this confirmed chapter are included. They are secondary study material, not official mark schemes. The selected note IDs and versions are recorded with the answer.</p>
                <ul className="calculation-checks">{approvedChapterNotes.map((note) => <li key={note.id}><span>{note.title} · Version {note.version_number}</span></li>)}</ul>
              </div> : approvedChapterNotesError ? <p className="question-card-meta">Could not load approved chapter notes for optional retrieval.</p> : null}
              <button className="primary-action" type="submit">Generate AI answer <span aria-hidden="true">→</span></button>
              <p className="question-card-meta">This action sends the question to your configured AI provider and may incur provider charges. Original source-page text and approved chapter-note content are sent only when you check their respective boxes above.</p>
            </form>
           ) : isOwner ? <p className="notice notice-info">This question needs teacher approval before it can be sent to the AI provider.</p> : <p className="notice notice-info">You have review access only. AI generation and question editing remain with the owner.</p>}
        </article>
        {isOwner ? (
          <section className="section web-research-panel">
            <p className="eyebrow">OPTIONAL WEB RESEARCH · OWNER-INITIATED</p>
            <h2>Find external source leads</h2>
            <p className="question-card-meta">Only the query you type below is sent to Brave Search; the question text and uploaded documents are not sent. Do not include personal or confidential details. Your search provider&apos;s own data handling and possible charges apply. Results are unverified leads, not official syllabus documents or mark schemes. Check the publisher, exact document version and page before using a source. Limit: five searches per 15 minutes and 20 per UTC day.</p>
            <form action={searchQuestionWebSources} className="review-form">
              <input type="hidden" name="questionId" value={question.id} />
              <label htmlFor="web-research-query">Search the web for supporting sources</label>
              <input id="web-research-query" name="query" required minLength={3} maxLength={500} placeholder="e.g. Cambridge O Level Physics 5054 official syllabus 2026" />
              <button className="primary-action" type="submit">Search web sources →</button>
            </form>
            {researchError ? <p className="notice notice-error">Could not load saved web research sources.</p> : null}
            {researchSources?.length ? (
              <ul className="calculation-checks">
                {researchSources.map((source) => (
                  <li key={source.id}>
                    <strong>UNVERIFIED SOURCE LEAD · {source.provider}</strong>
                    <a href={source.source_url} target="_blank" rel="noreferrer noopener">{source.title}</a>
                    <small>{source.snippet}</small>
                    <small>Query: {source.query} · {source.published_at ? "Publisher date: " + new Date(source.published_at).toLocaleDateString() + " · " : ""}Retrieved {new Date(source.retrieved_at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="question-card-meta">No web research sources saved for this question.</p>}
          </section>
        ) : null}
        {isOwner ? (
          <div className="classification-panel">
            <p className="eyebrow">SYLLABUS INTELLIGENCE · M5</p>
            <h2>Review syllabus classification</h2>
            <p className="question-card-meta">Record the exact syllabus specification and mark uncertain mappings for later checking. Classification review is separate from question-content approval.</p>
            <ClassificationForm
              question={question}
              catalogs={syllabusCatalogs ?? []}
              chapters={syllabusChapters ?? []}
              topics={syllabusTopics ?? []}
              evidence={syllabusEvidence ?? []}
            />
            <section className="classification-history">
              <h3>Classification change history</h3>
              <p className="question-card-meta">This append-only log records classification snapshots from the audit feature onward. Earlier changes cannot be reconstructed; existing records begin with a baseline snapshot.</p>
              {classificationHistoryError ? <p className="notice notice-error">Could not load classification history.</p>
                : classificationHistory?.length ? (
                  <ol className="calculation-checks">
                    {classificationHistory.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.event_type === "baseline" ? "BASELINE SNAPSHOT" : entry.event_type === "created" ? "INITIAL CLASSIFICATION" : "CLASSIFICATION UPDATED"}</strong>
                        <span>{new Date(entry.changed_at).toLocaleString()} · {entry.changed_by ? "Owner action" : "Existing-state snapshot"}</span>
                        {entry.previous_state ? <small>Before: {classificationSummary(entry.previous_state)}</small> : null}
                        <small>After: {classificationSummary(entry.new_state)}</small>
                      </li>
                    ))}
                  </ol>
                ) : <p className="question-card-meta">No classification changes recorded yet.</p>}
            </section>
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
            {sourceProvenanceSummary(selectedSolution?.source_context ?? null) ? <p className="question-card-meta">Source context used: {sourceProvenanceSummary(selectedSolution?.source_context ?? null)}. The extracted text itself is not stored with this answer.</p> : null}
            {knowledgeProvenanceSummary(selectedSolution?.knowledge_sources ?? null).length ? (
              <p className="question-card-meta">Approved chapter notes used as secondary context: {knowledgeProvenanceSummary(selectedSolution?.knowledge_sources ?? null).join(" · ")}. The immutable note versions are referenced; their full text is not copied into this answer record.</p>
            ) : null}
            <p className="notice notice-info">AI-generated draft. Review feedback is recorded separately and does not alter this answer. A teacher review is independent of the owner review, but it is not an official exam-board mark scheme.</p>
            <section className="section">
              <p className="eyebrow">MARK-SCHEME COMPARISON · OWNER-SUPPLIED SOURCE</p>
              <h3>Compare against a mark scheme</h3>
              <p className="question-card-meta">Enter mark points from a source you have checked yourself. The app does not fetch or certify the URL, and phrase matching cannot determine whether an idea is expressed equivalently. No marks are awarded.</p>
              {markSchemeError ? <p className="notice notice-error">Could not load saved mark schemes.</p> : null}
              {savedMarkSchemes?.map((saved) => {
                const parsedScheme = markSchemeSchema.safeParse({
                  title: saved.title,
                  awardingBody: saved.awarding_body,
                  qualification: saved.qualification,
                  subject: saved.subject,
                  paperReference: saved.paper_reference ?? undefined,
                  sourceUrl: saved.source_url,
                  sourceLocator: saved.source_locator ?? "Legacy reference — locator not recorded",
                  sourceDocumentVersion: saved.source_document_version ?? undefined,
                  points: saved.points,
                });
                if (!parsedScheme.success) return <p className="notice notice-error" key={saved.id}>A saved mark scheme has an invalid structure and cannot be compared.</p>;
                const comparison = compareAnswerToMarkScheme(answer.examAnswer + "\n" + answer.workingSteps.flatMap((step) => [step.step, step.explanation]).join("\n"), parsedScheme.data);
                return (
                  <article className="question-card" key={saved.id}>
                    <h4>{saved.title}</h4>
                    <p className="question-card-meta">{saved.awarding_body} · {saved.qualification} · {saved.subject}{saved.paper_reference ? " · " + saved.paper_reference : ""}</p>
                    <p className="question-card-meta">Owner-supplied source (not independently verified): <a href={saved.source_url} target="_blank" rel="noreferrer noopener">{saved.source_url}</a> · Locator: {saved.source_locator ?? "Not recorded (legacy reference)"}{saved.source_document_version ? " · Version: " + saved.source_document_version : ""} · Saved {new Date(saved.created_at).toLocaleString()}</p>
                    <ul className="calculation-checks">
                      {comparison.map((point) => <li key={point.id}>
                        <strong>{point.status === "possible_match" ? "POSSIBLE PHRASE MATCH" : point.status === "not_found" ? "PHRASE NOT FOUND" : "MANUAL REVIEW REQUIRED"}</strong>
                        <span>{point.id} · {point.description}{point.marks === undefined ? "" : " · " + point.marks + " mark(s) listed in source"}</span>
                        {point.matchedPhrases.length ? <small>Literal phrases found: {point.matchedPhrases.join("; ")}</small> : null}
                      </li>)}
                    </ul>
                  </article>
                );
              })}
              {isOwner ? (
                <MarkSchemeEditor
                  solutionId={selectedSolution?.id ?? ""}
                  board={question.board ?? ""}
                  qualification={question.qualification ?? ""}
                  subject={question.subject ?? ""}
                />
              ) : <p className="question-card-meta">Only the question owner can attach a mark scheme reference.</p>}
            </section>
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
