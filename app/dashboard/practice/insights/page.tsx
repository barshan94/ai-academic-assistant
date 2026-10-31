import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";
import type { DatabaseWithPractice } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Outcome = "correct" | "partial" | "incorrect" | "skipped";
type PracticeItem = {
  practice_set_id: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  outcome: Outcome | null;
  answered_at: string | null;
};

const labels: Record<Outcome, string> = {
  correct: "Correct",
  partial: "Partial",
  incorrect: "Incorrect",
  skipped: "Skipped",
};

export default async function PracticeInsightsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;

  const [{ data: sets, error: setsError }, { data: rawItems, error: itemsError }] = await Promise.all([
    db.from("practice_sets")
      .select("id,title,status,question_count,created_at,completed_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("practice_set_items")
      .select("practice_set_id,subject,chapter,topic,outcome,answered_at")
      .eq("owner_id", user.id)
      .order("answered_at", { ascending: false })
      .limit(3000),
  ]);

  const items = (rawItems ?? []) as PracticeItem[];
  const answered = items.filter((item) => item.outcome !== null);
  const count = (outcome: Outcome) => answered.filter((item) => item.outcome === outcome).length;
  const correct = count("correct");
  const partial = count("partial");
  const incorrect = count("incorrect");
  const skipped = count("skipped");
  const scored = correct + partial + incorrect;
  const completionRate = items.length ? Math.round((answered.length / items.length) * 100) : 0;
  const successRate = scored ? Math.round((correct / scored) * 100) : null;

  const groups = new Map<string, { subject: string; chapter: string; topic: string; total: number; correct: number; partial: number; incorrect: number; skipped: number }>();
  for (const item of answered) {
    const subject = item.subject?.trim() || "Unmapped subject";
    const chapter = item.chapter?.trim() || "Unmapped chapter";
    const topic = item.topic?.trim() || "Unmapped topic";
    const key = [subject, chapter, topic].join("\u001f");
    const group = groups.get(key) ?? { subject, chapter, topic, total: 0, correct: 0, partial: 0, incorrect: 0, skipped: 0 };
    group.total += 1;
    if (item.outcome) group[item.outcome] += 1;
    groups.set(key, group);
  }
  const topicRows = [...groups.values()]
    .sort((a, b) => (b.incorrect + b.partial) - (a.incorrect + a.partial) || b.total - a.total)
    .slice(0, 100);

  const hasErrors = Boolean(setsError || itemsError);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/practice">Practice sets</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · PERFORMANCE</p>
        <h1>Practice <span>insights.</span></h1>
        <p className="hero-copy">A combined view of the results you have recorded across saved practice sessions. These are self-assessments, not independently graded marks or proof of mastery.</p>
        <div className="hero-actions"><Link className="primary-action" href="/dashboard/practice">Create a practice set →</Link><Link className="sign-in-link" href="/dashboard/revision/insights">Revision confidence insights</Link></div>
      </section>
      {hasErrors ? <p className="notice notice-error" role="status">Some practice analytics could not be loaded. The figures below may be incomplete.</p> : null}
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">ALL RECORDED ATTEMPTS</p><h2>Overall snapshot</h2></div><span className="section-count">Up to 3,000 saved question results</span></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{sets?.length ?? 0}</span><h3>Practice sets</h3><p>Latest saved sessions, up to 300.</p></article>
          <article className="module-card"><span className="module-number">{answered.length}/{items.length}</span><h3>Marked questions</h3><p>{completionRate}% of loaded question snapshots have a recorded outcome.</p></article>
          <article className="module-card"><span className="module-number">{successRate === null ? "—" : successRate + "%"}</span><h3>Self-marked correct</h3><p>Correct divided by correct, partial and incorrect; skipped items are excluded.</p></article>
          <article className="module-card"><span className="module-number">{incorrect + partial}</span><h3>More practice recorded</h3><p>Incorrect or partially solved attempts, based on your own marking.</p></article>
        </div>
        <div className="question-card">
          <div className="question-card-heading"><strong>Outcome breakdown</strong><span className="question-subject">{scored} scored attempts</span></div>
          <p className="question-card-meta">Correct: {correct} · Partial: {partial} · Incorrect: {incorrect} · Skipped: {skipped}</p>
          <p className="question-card-meta">Skipped questions count as marked for session completion, but are excluded from the self-marked correct percentage.</p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">WHERE TO FOCUS</p><h2>Subject, chapter and topic patterns</h2></div><span className="section-count">{topicRows.length} groups</span></div>
        {!topicRows.length ? <div className="empty-state"><h3>No marked practice results yet</h3><p>Record outcomes in a practice session. Topic summaries will appear once there is saved history.</p></div> : (
          <div className="question-list">
            {topicRows.map((group) => {
              const scoredCount = group.correct + group.partial + group.incorrect;
              const needsReview = scoredCount >= 3 && (group.partial + group.incorrect) / scoredCount >= 0.5;
              const enoughData = scoredCount >= 3;
              return (
                <article className="question-card" key={[group.subject,group.chapter,group.topic].join("|")}>
                  <div className="question-card-heading"><span className="document-status">{needsReview ? "Repeat practice may help" : enoughData ? "Recorded pattern" : "Limited sample"}</span><span className="question-subject">{group.total} marked</span></div>
                  <h3>{group.topic}</h3>
                  <p className="question-card-meta">{group.subject} · {group.chapter}</p>
                  <p className="question-card-meta">Correct {group.correct} · Partial {group.partial} · Incorrect {group.incorrect} · Skipped {group.skipped}</p>
                  {!enoughData ? <p className="question-card-meta">Fewer than three scored attempts: not enough data to suggest a recurring practice need.</p>
                    : needsReview ? <p className="question-card-meta">At least half of {scoredCount} scored attempts were partial or incorrect. This is a practice signal, not a diagnosis of weak understanding.</p>
                    : <p className="question-card-meta">At least three scored attempts are available; the current self-marked results do not meet the repeat-practice threshold.</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Saved sessions</h2></div></div>
        {!sets?.length ? <div className="empty-state"><p>No saved practice sessions yet.</p></div> : (
          <div className="question-list">
            {sets.slice(0, 12).map((set) => (
              <article className="question-card" key={set.id}>
                <div className="question-card-heading"><span className="document-status">{set.status.replace("_", " ")}</span><span className="question-subject">{set.question_count} questions</span></div>
                <h3>{set.title}</h3>
                <p className="question-card-meta">Created {new Date(set.created_at).toLocaleString()}</p>
                <Link className="document-open" href={"/dashboard/practice/" + set.id}>Open saved session ↗</Link>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="question-card-meta">Coverage note: analytics use up to the latest 300 practice sets and 3,000 saved question snapshots. A topic without mapped subject/chapter/topic metadata is grouped under an unmapped label. No AI grading or mastery prediction is performed.</p>
    </main>
  );
}
