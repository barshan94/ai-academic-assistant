import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import type { DatabaseWithPractice } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";

function dueDescription(value: string, now: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Review date unavailable";
  if (timestamp <= now) return "Due now";
  const days = Math.ceil((timestamp - now) / 86_400_000);
  return days === 1 ? "Due tomorrow" : "Due in " + days + " days";
}

export default async function StudyPlanPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;

  const [
    { data: revisionRows, error: revisionError },
    { data: sets, error: setsError },
  ] = await Promise.all([
    db.from("question_revision_progress")
      .select("question_id,confidence,status,next_review_at,last_reviewed_at,review_count")
      .eq("owner_id", user.id)
      .order("next_review_at", { ascending: true })
      .limit(500),
    db.from("practice_sets")
      .select("id,title,status,question_count,created_at")
      .eq("owner_id", user.id)
      .eq("status", "in_progress")
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const now = Date.now();
  const dueRevisions = (revisionRows ?? []).filter((item) => {
    const due = new Date(item.next_review_at).getTime();
    return Number.isFinite(due) && due <= now;
  });
  const revisionQuestionIds = [...new Set(dueRevisions.map((item) => item.question_id))];
  let revisionQuestions: Array<{
    id: string; question_text: string; question_number: string | null;
    subject: string | null; chapter: string | null; topic: string | null;
  }> = [];
  let questionError: { message: string } | null = null;
  if (revisionQuestionIds.length) {
    const result = await db.from("questions")
      .select("id,question_text,question_number,subject,chapter,topic")
      .eq("owner_id", user.id)
      .eq("review_status", "approved")
      .in("id", revisionQuestionIds);
    revisionQuestions = result.data ?? [];
    questionError = result.error;
  }

  const activeSetIds = (sets ?? []).map((set) => set.id);
  let unfinishedItems: Array<{
    id: string; practice_set_id: string; position: number;
    question_text: string; question_number: string | null;
    subject: string | null; chapter: string | null; topic: string | null;
  }> = [];
  let itemsError: { message: string } | null = null;
  if (activeSetIds.length) {
    const result = await db.from("practice_set_items")
      .select("id,practice_set_id,position,question_text,question_number,subject,chapter,topic")
      .eq("owner_id", user.id)
      .in("practice_set_id", activeSetIds)
      .is("outcome", null)
      .order("practice_set_id", { ascending: true })
      .order("position", { ascending: true })
      .limit(1000);
    unfinishedItems = result.data ?? [];
    itemsError = result.error;
  }

  const questionById = new Map(revisionQuestions.map((question) => [question.id, question]));
  const setById = new Map((sets ?? []).map((set) => [set.id, set]));
  const visibleDueRevisions = dueRevisions.filter((item) => questionById.has(item.question_id));
  const hasErrors = Boolean(revisionError || setsError || questionError || itemsError);
  const totalTasks = visibleDueRevisions.length + unfinishedItems.length;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/revision">Revision tracker</Link>
          <Link className="sign-in-link" href="/dashboard/practice">Practice sets</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · DAILY WORKSPACE</p>
        <h1>Your <span>study plan.</span></h1>
        <p className="hero-copy">A live queue of scheduled revision reviews and unfinished practice questions. These are separate activities: a review is scheduled from your confidence rating, while a practice question stays open until you record an outcome.</p>
        <div className="hero-actions">
          <Link className="primary-action" href="/dashboard/revision">Open revision tracker →</Link>
          <Link className="sign-in-link" href="/dashboard/practice">Open practice sets</Link>
        </div>
      </section>

      {hasErrors ? <p className="notice notice-error" role="status">Some study-plan data could not be loaded. The queue may be incomplete; refresh to try again.</p> : null}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">TODAY'S WORKLOAD</p><h2>What is waiting?</h2></div>
          <span className="section-count">{totalTasks} open tasks</span>
        </div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{visibleDueRevisions.length}</span><h3>Due revisions</h3><p>Approved questions whose scheduled review date has arrived.</p></article>
          <article className="module-card"><span className="module-number">{unfinishedItems.length}</span><h3>Practice remaining</h3><p>Questions in active practice sets without a saved result.</p></article>
          <article className="module-card"><span className="module-number">{sets?.length ?? 0}</span><h3>Active sessions</h3><p>Practice sets that have not yet been fully marked.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">SPACED REVISION</p><h2>Reviews due now</h2></div><span className="section-count">{visibleDueRevisions.length} questions</span></div>
        {!visibleDueRevisions.length ? (
          <div className="empty-state"><h3>No scheduled reviews are due</h3><p>That means no currently tracked question has reached its next review date. You can still work through your active practice sessions.</p><Link className="primary-action" href="/dashboard/revision">View revision tracker →</Link></div>
        ) : (
          <div className="question-list">
            {visibleDueRevisions.map((item) => {
              const question = questionById.get(item.question_id)!;
              return (
                <article className="question-card revision-card" key={item.question_id}>
                  <div className="question-card-heading"><span className="document-status">Due now · {item.status}</span><span className="question-subject">{question.subject ?? "Subject not set"}</span></div>
                  <p className="question-card-text">{question.question_number ? question.question_number + ". " : ""}{question.question_text}</p>
                  <p className="question-card-meta">{[question.chapter, question.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"} · Previous confidence {item.confidence}/5 · {item.review_count} reviews</p>
                  <div className="question-card-footer"><Link className="document-open" href="/dashboard/revision">Rate confidence & schedule next review ↗</Link><Link className="document-open" href={"/dashboard/questions/" + question.id}>Open question ↗</Link></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">UNFINISHED PRACTICE</p><h2>Continue your sessions</h2></div><span className="section-count">{unfinishedItems.length} questions</span></div>
        {!unfinishedItems.length ? (
          <div className="empty-state"><h3>No unfinished practice questions</h3><p>All questions in your active sessions have a recorded result, or you have no active sessions.</p><Link className="primary-action" href="/dashboard/practice">Create a practice set →</Link></div>
        ) : (
          <div className="question-list">
            {unfinishedItems.map((item) => {
              const set = setById.get(item.practice_set_id);
              return (
                <article className="question-card" key={item.id}>
                  <div className="question-card-heading"><span className="document-status">Awaiting your result · Question {item.position}</span><span className="question-subject">{item.subject ?? "Subject not set"}</span></div>
                  <h3>{set?.title ?? "Practice session"}</h3>
                  <p className="question-card-text">{item.question_number ? item.question_number + ". " : ""}{item.question_text}</p>
                  <p className="question-card-meta">{[item.chapter, item.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"}</p>
                  <div className="question-card-footer"><Link className="document-open" href={"/dashboard/practice/" + item.practice_set_id}>Continue session & record result ↗</Link></div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="question-card-meta">Queue limits: latest 500 revision records, 100 active practice sets and 1,000 unfinished practice questions. This planner does not generate new assignments or infer mastery.</p>
    </main>
  );
}
