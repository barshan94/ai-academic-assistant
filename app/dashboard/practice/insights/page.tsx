import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";
import type { DatabaseWithPractice, PracticeInsightsResult } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";


export default async function PracticeInsightsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  const { data, error } = await db.rpc("get_practice_insights");
  const insights = data as PracticeInsightsResult | null;
  const summary = insights?.summary ?? {
    total_sets: 0, total_items: 0, marked: 0,
    correct: 0, partial: 0, incorrect: 0, skipped: 0,
  };
  const correct = summary.correct;
  const partial = summary.partial;
  const incorrect = summary.incorrect;
  const skipped = summary.skipped;
  const scored = correct + partial + incorrect;
  const completionRate = summary.total_items
    ? Math.round((summary.marked / summary.total_items) * 100)
    : 0;
  const successRate = scored ? Math.round((correct / scored) * 100) : null;

  const weeklyTrend = (insights?.weekly ?? []).map((week) => {
    const start = new Date(week.week_start + "T00:00:00.000Z");
    const weekScored = week.correct + week.partial + week.incorrect;
    return {
      key: week.week_start,
      label: start.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
      total: week.marked,
      scored: weekScored,
      correctRate: weekScored ? Math.round((week.correct / weekScored) * 100) : null,
      needsMoreData: weekScored < 3,
    };
  });
  const trendWeeksWithData = weeklyTrend.filter((week) => week.scored >= 3);
  const trendFirst = trendWeeksWithData[0];
  const trendLast = trendWeeksWithData[trendWeeksWithData.length - 1];
  const trendChange = trendFirst && trendLast && trendFirst.key !== trendLast.key
    ? trendLast.correctRate! - trendFirst.correctRate!
    : null;

  const topicRows = insights?.topics ?? [];
  const recentSessions = insights?.recent_sessions ?? [];
  const hasError = Boolean(error);

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
        <p className="hero-copy">A combined view of every saved practice result in your account. These are self-assessments, not independently graded marks or proof of mastery.</p>
        <div className="hero-actions"><Link className="primary-action" href="/dashboard/practice">Create a practice set →</Link><Link className="sign-in-link" href="/dashboard/revision/insights">Revision confidence insights</Link></div>
      </section>
      {hasError ? <p className="notice notice-error" role="status">Practice analytics could not be loaded. Refresh the page; no partial totals are being presented as complete.</p> : null}
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">ALL RECORDED ATTEMPTS</p><h2>Overall snapshot</h2></div><span className="section-count">Complete saved history</span></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{summary.total_sets}</span><h3>Practice sets</h3><p>All saved sessions in this account.</p></article>
          <article className="module-card"><span className="module-number">{summary.marked}/{summary.total_items}</span><h3>Marked questions</h3><p>{completionRate}% of all saved question snapshots have a recorded outcome.</p></article>
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
        <div className="section-heading"><div><p className="eyebrow">PROGRESS OVER TIME</p><h2>Weekly practice trend</h2></div><span className="section-count">Last 8 weeks · all saved attempts</span></div>
        <div className="question-card">
          <div className="question-card-heading"><strong>Self-marked correct rate</strong><span className="question-subject">{trendChange === null ? "Not enough comparable weeks" : `${trendChange > 0 ? "+" : ""}${trendChange} percentage points`}</span></div>
          <p className="question-card-meta">Each week uses correct ÷ (correct + partial + incorrect). Skipped answers are excluded. A week needs at least three scored answers before its rate is interpreted.</p>
          <div className="practice-trend-list">
            {weeklyTrend.map((week) => (
              <div className="practice-trend-row" key={week.key}>
                <div className="practice-trend-label"><strong>{week.label}</strong><span>{week.total} marked · {week.scored} scored</span></div>
                <div className="practice-trend-track" role="img" aria-label={week.needsMoreData ? `${week.label}: fewer than three scored answers` : `${week.label}: ${week.correctRate}% self-marked correct`}>
                  <span className="practice-trend-fill" style={{ width: `${week.correctRate ?? 0}%` }} />
                </div>
                <strong className="practice-trend-value">{week.needsMoreData ? "—" : `${week.correctRate}%`}</strong>
              </div>
            ))}
          </div>
          {trendChange === null
            ? <p className="question-card-meta">There are not yet two separate weeks with enough scored attempts to compare. No trend is inferred from sparse data.</p>
            : <p className="question-card-meta">The displayed change compares the earliest and latest weeks with at least three scored attempts in this eight-week window. It is descriptive, not a prediction of future performance.</p>}
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">WHERE TO FOCUS</p><h2>Subject, chapter and topic patterns</h2></div><span className="section-count">Top {topicRows.length} groups</span></div>
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
        <p className="question-card-meta">Topic groups are aggregated across the full saved history; this page displays the 100 groups with the highest partial/incorrect counts. Unmapped metadata is retained under an explicit unmapped label.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Saved sessions</h2></div><span className="section-count">Latest {recentSessions.length}</span></div>
        {!recentSessions.length ? <div className="empty-state"><p>No saved practice sessions yet.</p></div> : (
          <div className="question-list">
            {recentSessions.map((set) => (
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
      <p className="question-card-meta">Coverage note: all saved outcomes and all saved sets are included in the database-side totals. Only eight weekly buckets, the top 100 topic groups and the twelve most recent sessions are sent to this page. No AI grading or mastery prediction is performed.</p>
    </main>
  );
}
