import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { recordRevision } from "./actions";
import type { DatabaseWithRevision } from "@/types/revision-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PageProps = {
  searchParams: Promise<{ save?: string }>;
};

const confidenceLabels: Record<number, string> = {
  1: "I could not solve it",
  2: "I needed major help",
  3: "I solved it with some effort",
  4: "I solved it confidently",
  5: "I can explain it without help",
};

function dueLabel(value: string, now: number): string {
  const due = new Date(value).getTime();
  if (due <= now) return "Due now";
  const days = Math.ceil((due - now) / 86_400_000);
  return days === 1 ? "Due tomorrow" : "Due in " + days + " days";
}

export default async function RevisionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithRevision>;
  const [{ data: questions, error: questionError }, { data: progress, error: progressError }] = await Promise.all([
    typedSupabase.from("questions")
      .select("id,question_number,question_text,subject,chapter,topic,created_at")
      .eq("owner_id", user.id)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(200),
    typedSupabase.from("question_revision_progress")
      .select("question_id,confidence,status,next_review_at,last_reviewed_at,review_count")
      .eq("owner_id", user.id),
  ]);

  const now = Date.now();
  const progressByQuestion = new Map((progress ?? []).map((item) => [item.question_id, item]));
  const rows = (questions ?? []).map((question) => ({
    question,
    progress: progressByQuestion.get(question.id) ?? null,
  }));
  const dueCount = rows.filter(({ progress: item }) => item && new Date(item.next_review_at).getTime() <= now).length;
  const untrackedCount = rows.filter(({ progress: item }) => !item).length;
  const learningCount = rows.filter(({ progress: item }) => item?.status === "learning").length;
  const confidentCount = rows.filter(({ progress: item }) => item?.status === "confident").length;

  const notice = params.save === "updated" ? "Revision confidence saved and the next review date scheduled."
    : params.save === "failed" ? "Could not save this revision. Confirm the question is approved and try again."
    : params.save === "invalid" ? "The revision form was invalid."
    : null;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Questions</Link>
          <Link className="sign-in-link" href="/dashboard/chapters">Chapter notes</Link>
          <Link className="sign-in-link" href="/dashboard/revision/insights">Topic insights</Link>
          <Link className="sign-in-link" href="/dashboard/practice">Practice sets</Link>
          <Link className="sign-in-link" href="/dashboard/practice/insights">Practice insights</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · REVISION TRACKER</p>
        <h1>Know what needs <span>another look.</span></h1>
        <p className="hero-copy">Track how confidently you can solve each approved question. Your rating schedules the next review; it is a personal reminder, not an objective measure of mastery.</p>
      </section>

      {notice ? <p className={params.save === "updated" ? "notice notice-info" : "notice notice-error"} role="status">{notice}</p> : null}
      {questionError || progressError ? <p className="notice notice-error">Some revision data could not be loaded. Refresh the page to try again.</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">YOUR REVISION OVERVIEW</p><h2>Study queue</h2></div><span className="section-count">{rows.length} approved questions · latest 200</span></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{dueCount}</span><h3>Due now</h3><p>Questions whose next review date has arrived.</p></article>
          <article className="module-card"><span className="module-number">{untrackedCount}</span><h3>Not tracked</h3><p>Approved questions you have not rated yet.</p></article>
          <article className="module-card"><span className="module-number">{learningCount}</span><h3>Still learning</h3><p>Questions rated 1 or 2 most recently.</p></article>
          <article className="module-card"><span className="module-number">{confidentCount}</span><h3>Feeling confident</h3><p>Questions most recently rated 4 or 5.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">PRIORITIZED PRACTICE</p><h2>What to revise</h2></div><span className="section-count">{dueCount} due now</span></div>
        {rows.length === 0 ? (
          <div className="empty-state"><h3>Your revision queue is empty</h3><p>Approve questions in your question library first. They will appear here for confidence tracking.</p><Link className="primary-action" href="/dashboard/questions">Open question library →</Link></div>
        ) : (
          <div className="question-list">
            {rows.sort((a, b) => {
              const aDue = a.progress ? new Date(a.progress.next_review_at).getTime() : now;
              const bDue = b.progress ? new Date(b.progress.next_review_at).getTime() : now;
              return aDue - bDue;
            }).map(({ question, progress: item }) => {
              const due = !item || new Date(item.next_review_at).getTime() <= now;
              return (
                <article className="question-card revision-card" key={question.id}>
                  <div className="question-card-heading">
                    <span className="document-status">{!item ? "not tracked" : item.status}</span>
                    <span className="question-subject">{question.subject ?? "Subject not set"}</span>
                  </div>
                  <p className="question-card-text">{question.question_number ? question.question_number + ". " : ""}{question.question_text}</p>
                  <p className="question-card-meta">{[question.chapter, question.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"} · {item ? dueLabel(item.next_review_at, now) + " · " + item.review_count + " reviews" : "Ready for first review"}</p>
                  {item ? <p className="question-card-meta">Last confidence: {item.confidence}/5 · Last reviewed {new Date(item.last_reviewed_at).toLocaleDateString()}</p> : null}
                  <div className="question-card-footer">
                    <Link className="document-open" href={"/dashboard/questions/" + question.id}>Open question ↗</Link>
                  </div>
                  <form action={recordRevision} className="revision-rating-form">
                    <input type="hidden" name="questionId" value={question.id} />
                    <label htmlFor={"confidence-" + question.id}>How well could you solve it?</label>
                    <select id={"confidence-" + question.id} name="confidence" defaultValue={String(item?.confidence ?? 3)}>
                      {Object.entries(confidenceLabels).map(([value, label]) => <option key={value} value={value}>{value}/5 · {label}</option>)}
                    </select>
                    <button className="document-action" type="submit">{due ? "Save review & schedule next" : "Update confidence & reschedule"}</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
