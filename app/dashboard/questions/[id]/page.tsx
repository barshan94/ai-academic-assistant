import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateQuestionSolution } from "./actions";
import { checkCalculations } from "@/lib/ai/math-check";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamAnswer } from "@/lib/ai/answer-schema";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ solve?: string }>;
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
    .select("id,question_text,question_number,board,qualification,subject,chapter,topic,review_status,created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !question) notFound();

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const { data: solutions, error: solutionError } = await typedSupabase.from("question_solutions")
    .select("id,provider,model,prompt_version,answer_json,verification_status,created_at")
    .eq("question_id", question.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const latest = solutions?.[0];
  const answer = latest?.answer_json as unknown as ExamAnswer | undefined;
  const arithmeticResults = answer ? checkCalculations(answer.calculationChecks ?? []) : [];
  const arithmeticPassed = arithmeticResults.length > 0 && arithmeticResults.every((item) => item.status === "passed");
  const message = query.solve ? messages[query.solve] ?? "Answer generation failed (" + query.solve.slice(0, 80) + ")." : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/questions">Question bank</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">ACADEMIC SOLVER · M3</p>
        <h1>Question <span>workspace.</span></h1>
        <p className="hero-copy">Generate an examination-style answer with Bengali and English teaching explanations. Generated answers are drafts, not verified mark-scheme solutions.</p>
      </section>
      {message ? <p className="notice notice-info" role="status">{message}</p> : null}
      {solutionError ? <p className="notice notice-error">Could not load saved answers.</p> : null}
      <section className="section">
        <article className="question-card">
          <div className="question-card-heading">
            <span className="document-status">{question.review_status.replace("_", " ")}</span>
            <span className="question-subject">{question.subject ?? "Subject not set"}</span>
          </div>
          <p className="question-card-text">{question.question_number ? question.question_number + ". " : ""}{question.question_text}</p>
          <p className="question-card-meta">{[question.board, question.qualification, question.chapter, question.topic].filter(Boolean).join(" · ") || "Syllabus metadata not set"}</p>
          {question.review_status === "approved" ? (
            <form action={generateQuestionSolution}>
              <input type="hidden" name="questionId" value={question.id} />
              <button className="primary-action" type="submit">Generate AI answer <span aria-hidden="true">→</span></button>
              <p className="question-card-meta">This action sends the question to your configured AI provider and may incur provider charges.</p>
            </form>
          ) : <p className="notice notice-info">This question needs teacher approval before it can be sent to the AI provider.</p>}
        </article>
      </section>
      {answer ? (
        <section className="section">
          <div className="section-heading"><div><p className="eyebrow">LATEST GENERATED RESPONSE</p><h2>Answer draft</h2></div><span className="document-status">{latest?.verification_status.replace("_", " ")}</span></div>
          <article className="solution-panel">
            <p className="eyebrow">EXAM-READY ANSWER</p>
            <div className="solution-prose">{answer.examAnswer}</div>
            {answer.workingSteps.length ? <>
              <h3>Working and reasoning</h3>
              <ol className="solution-steps">{answer.workingSteps.map((step, index) => <li key={index}><strong>{step.step}</strong><p>{step.explanation}</p></li>)}</ol>
            </> : null}
            {answer.calculationChecks.length ? <>
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
            <h3>Bengali explanation</h3><div className="solution-prose" lang="bn">{answer.bengaliExplanation}</div>
            <h3>English explanation</h3><div className="solution-prose">{answer.englishExplanation}</div>
            {answer.keyConcepts.length ? <><h3>Key concepts</h3><ul>{answer.keyConcepts.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {answer.assumptions.length ? <><h3>Assumptions</h3><ul>{answer.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            {answer.limitations.length ? <><h3>Limitations</h3><ul>{answer.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}
            <p className="question-card-meta">Provider: {latest?.provider} · Model: {latest?.model} · Prompt: {latest?.prompt_version}</p>
            <p className="notice notice-info">Not independently verified. Check calculations, units, syllabus alignment and any official mark scheme before relying on this answer.</p>
          </article>
        </section>
      ) : null}
      {solutions && solutions.length > 1 ? (
        <section className="section"><h2>Previous generated drafts</h2>{solutions.slice(1).map((item) => <p className="question-card-meta" key={item.id}>{new Date(item.created_at).toLocaleString()} · {item.provider} / {item.model} · {item.verification_status}</p>)}</section>
      ) : null}
    </main>
  );
}
