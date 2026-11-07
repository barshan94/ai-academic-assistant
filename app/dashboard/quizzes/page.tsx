import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { generateQuizDraft, updateQuizDraftStatus, updateQuizDraftQuestion } from "./actions";
import type { DatabaseWithQuiz, GeneratedQuizRow } from "@/types/quiz-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type QuizPageProps = {
  searchParams: Promise<{ generate?: string; status?: string; edit?: string }>;
};

export default async function QuizzesPage({ searchParams }: QuizPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithQuiz>;
  const [{ data: questions, error: questionError }, { data: quizzes, error: quizError }] = await Promise.all([
    supabase.from("questions")
      .select("id,question_number,question_text,subject,chapter,topic")
      .eq("owner_id", user.id)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("generated_quizzes")
      .select("id,title,subject,chapter,question_count,quiz_json,source_question_ids,status,created_at,reviewed_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const approvedQuestionIds = (questions ?? []).map((question) => question.id);
  const { data: importanceMarks, error: importanceError } = approvedQuestionIds.length
    ? await supabase.from("question_importance")
      .select("question_id,importance_level,rationale")
      .eq("owner_id", user.id)
      .in("question_id", approvedQuestionIds)
    : { data: [], error: null };
  const importanceByQuestion = new Map((importanceMarks ?? []).map((mark) => [mark.question_id, mark]));
  const importanceRank: Record<string, number> = { core: 3, high: 2, medium: 1 };
  const rankedQuestions = [...(questions ?? [])].sort((a, b) =>
    (importanceRank[importanceByQuestion.get(b.id)?.importance_level ?? ""] ?? 0) -
    (importanceRank[importanceByQuestion.get(a.id)?.importance_level ?? ""] ?? 0)
  );
  const defaultSubject = subjects[0];
  const preselectedImportantIds = new Set(
    rankedQuestions
      .filter((question) => question.subject === defaultSubject && importanceByQuestion.has(question.id))
      .slice(0, 20)
      .map((question) => question.id)
  );

  const sourceQuestionIds = Array.from(new Set((quizzes ?? []).flatMap((quiz) => quiz.source_question_ids)));
  const { data: sourceQuestions, error: sourceQuestionError } = sourceQuestionIds.length
    ? await db.from("questions")
      .select("id,question_text,subject,chapter,question_number")
      .eq("owner_id", user.id)
      .in("id", sourceQuestionIds)
    : { data: [], error: null };
  const sourceQuestionMap = new Map((sourceQuestions ?? []).map((question) => [question.id, question]));

  const subjects = Array.from(new Set((questions ?? []).map((item) => item.subject).filter((value): value is string => Boolean(value)))).sort();
  const notice = params.edit === "saved" ? "Draft question updated. Review the full quiz again before approving it."
    : params.edit === "blocked" ? "The edit was blocked. Only your own quiz drafts can be edited before approval."
    : params.edit === "invalid" ? "The edited question fields were invalid."
    : params.generate === "saved" ? "Quiz draft saved. Review every answer and explanation before approving it."
    : params.generate === "not_configured" ? "AI is disabled or no quiz-capable provider is configured. No provider request was made."
    : params.generate === "sources" ? "One or more selected questions are unavailable or are no longer approved."
    : params.generate === "mixed_subject" ? "Select approved questions from one subject only, and choose that same subject."
    : params.generate === "save_failed" ? "The generated quiz could not be saved. No draft was created."
    : params.generate === "failed" ? "Quiz generation failed or returned invalid content. Check provider configuration and try again."
    : params.generate === "invalid" ? "Check the quiz details and select 1–20 distinct approved source questions."
    : params.status === "updated" ? "Quiz review status updated."
    : params.status === "blocked" ? "The status change was blocked. Only your own non-archived quiz drafts can be reviewed."
    : params.status === "invalid" ? "The requested review action was invalid."
    : null;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Question bank</Link>
          <Link className="sign-in-link" href="/dashboard/chapters">Chapter notes</Link>
          <Link className="sign-in-link" href="/dashboard/practice">Practice</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">ASSESSMENT BUILDER · TEACHER WORKSPACE</p>
        <h1>Create a <span>practice quiz.</span></h1>
        <p className="hero-copy">Generate MCQs and short-answer questions from your own approved question bank. Every generated question must cite its source, include an explanation, and pass structural validation. AI output is a draft, not an exam prediction.</p>
        <div className="hero-actions"><Link className="sign-in-link" href="/dashboard/questions">Review source questions</Link></div>
      </section>

      {notice ? <p className="notice notice-info" role="status">{notice}</p> : null}
      {questionError || quizError || sourceQuestionError || importanceError ? <p className="notice notice-error">Some quiz workspace data could not be loaded. Refresh or check the database connection.</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">NEW QUIZ DRAFT</p><h2>Choose source material</h2></div><span className="section-count">{questions?.length ?? 0} approved questions loaded</span></div>
        {!subjects.length ? (
          <div className="empty-state"><h3>No approved source questions</h3><p>Approve and classify questions in your question bank before generating a quiz. Unreviewed material is never sent to the AI quiz generator.</p><Link className="primary-action" href="/dashboard/questions">Open question bank →</Link></div>
        ) : (
          <form action={generateQuizDraft} className="review-form">
            <div className="question-fields">
              <label>Quiz title<input name="title" required maxLength={160} defaultValue="Chapter practice quiz" /></label>
              <label>Subject<select name="subject" required defaultValue={subjects[0]}>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label>Chapter (optional)<input name="chapter" maxLength={160} placeholder="e.g. Motion and forces" /></label>
              <label>Number of generated questions<select name="count" defaultValue="10">{[5,10,15,20,25,30].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
            </div>
            <div className="chapter-source-picker">
              <strong>Select 1–20 approved source questions from the selected subject</strong>
              <p className="question-card-meta">Your Core, High and Medium questions for the default subject are preselected first (up to 20). You can change the selection. Priority is a teacher's revision choice, not an exam prediction.</p>
              {rankedQuestions.map((question) => {
                const priority = importanceByQuestion.get(question.id);
                return (
                  <label className="chapter-source-option" key={question.id}>
                    <input type="checkbox" name="questionIds" value={question.id} defaultChecked={preselectedImportantIds.has(question.id)} />
                    <span><strong>{question.subject ?? "Unspecified subject"}</strong>{question.chapter ? " · " + question.chapter : ""}{question.question_number ? " · Q" + question.question_number : ""}
                      {priority ? <span className="document-status"> · {priority.importance_level.toUpperCase()} PRIORITY</span> : null}
                      <br />{question.question_text.slice(0, 360)}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="question-card-meta">The server rechecks ownership, approval status, duplicate IDs and subject consistency before sending source text to the configured provider. AI generation is opt-in and requires AI_ENABLED=true plus a quiz-capable provider.</p>
            <button className="primary-action" type="submit">Generate source-linked quiz draft →</button>
          </form>
        )}
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">SAVED QUIZZES</p><h2>Review and approval</h2></div><span className="section-count">{quizzes?.length ?? 0} recent drafts</span></div>
        <p className="question-card-meta">Important: “Approved” means teacher-reviewed and locked in this private workspace. It does not publish or share the quiz with students. Student accounts and controlled quiz access are not implemented yet.</p>
        {!quizzes?.length ? <div className="empty-state"><h3>No saved quizzes yet</h3><p>Generated drafts will appear here with their source-question references.</p></div> : (
          <div className="question-list">
            {(quizzes as GeneratedQuizRow[]).map((quiz) => {
              const payload = quiz.quiz_json as unknown as { title?: string; instructions?: string; questions?: Array<{ type: string; prompt: string; options: string[]; correctAnswer: string; explanation: string; difficulty: string; sourceRefs: string[] }> };
              return (
                <article className="question-card" key={quiz.id}>
                  <div className="question-card-heading"><span className="document-status">{quiz.status}</span><span className="question-subject">{quiz.question_count} questions · {quiz.subject}{quiz.chapter ? " · " + quiz.chapter : ""}</span></div>
                  <h3>{quiz.title}</h3>
                  <p className="question-card-meta">{payload.instructions ?? "Review the generated questions, answer keys and explanations."} · {quiz.source_question_ids.length} source questions · {new Date(quiz.created_at).toLocaleString()}</p>
                  <details className="syllabus-evidence-form">
                    <summary>View verified source questions ({quiz.source_question_ids.length})</summary>
                    <ul>
                      {quiz.source_question_ids.map((sourceId) => {
                        const source = sourceQuestionMap.get(sourceId);
                        return <li key={sourceId}>{source ? <Link className="document-open" href={"/dashboard/questions/" + source.id}>{source.subject ?? "Subject not set"}{source.chapter ? " · " + source.chapter : ""}{source.question_number ? " · Q" + source.question_number : ""}: {source.question_text.slice(0, 260)} ↗</Link> : <span>Source question is no longer available in your account.</span>}</li>;
                      })}
                    </ul>
                  </details>
                  {(payload.questions ?? []).map((question, index) => (
                    <div className="chapter-note-version" key={index}>
                      <div className="question-card-heading"><strong>Question {index + 1} · {question.type.replace("_", " ")} · {question.difficulty}</strong><span className="document-status">{question.sourceRefs.join(", ")}</span></div>
                      <p>{question.prompt}</p>
                      {question.options?.length ? <ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol> : null}
                      <p><strong>Answer:</strong> {question.correctAnswer}</p>
                      <p><strong>Explanation:</strong> {question.explanation}</p>
                      {quiz.status === "draft" ? (
                        <details className="syllabus-evidence-form">
                          <summary>Edit this draft question</summary>
                          <form action={updateQuizDraftQuestion} className="review-form">
                            <input type="hidden" name="quizId" value={quiz.id} />
                            <input type="hidden" name="questionIndex" value={index} />
                            <label>Question prompt<textarea name="prompt" required maxLength={2000} rows={3} defaultValue={question.prompt} /></label>
                            {question.type === "mcq" ? (
                              <label>Answer options (one per line; exactly four distinct options)<textarea name="options" required maxLength={2200} rows={5} defaultValue={question.options.join("\n")} /></label>
                            ) : <input type="hidden" name="options" value="" />}
                            <label>{question.type === "mcq" ? "Correct answer (must exactly match one option)" : "Model answer"}<input name="correctAnswer" required maxLength={1000} defaultValue={question.correctAnswer} /></label>
                            <label>Explanation<textarea name="explanation" required maxLength={2000} rows={3} defaultValue={question.explanation} /></label>
                            <button className="document-action" type="submit">Save question edits</button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  ))}
                  {quiz.status === "draft" ? <div className="question-review-actions">
                    <form action={updateQuizDraftStatus}><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="status" value="approved" /><button className="document-action" type="submit">Approve reviewed quiz</button></form>
                    <form action={updateQuizDraftStatus}><input type="hidden" name="quizId" value={quiz.id} /><input type="hidden" name="status" value="archived" /><button className="document-action document-action-muted" type="submit">Archive</button></form>
                  </div> : null}
                  {quiz.status === "approved" ? <p className="question-card-meta">Teacher-approved on {quiz.reviewed_at ? new Date(quiz.reviewed_at).toLocaleString() : "date unavailable"}. Not published to students: student membership and delivery controls are not yet implemented.</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
