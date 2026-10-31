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
      .limit(301),
    db.from("practice_set_items")
      .select("practice_set_id,subject,chapter,topic,outcome,answered_at")
      .eq("owner_id", user.id)
      .order("answered_at", { ascending: false, nullsFirst: false })
      .limit(3001),
  ]);

  const setOverflow = (sets?.length ?? 0) > 300;
  const itemOverflow = (rawItems?.length ?? 0) > 3000;
  const visibleSets = (sets ?? []).slice(0, 300);
  const items = ((rawItems ?? []).slice(0, 3000)) as PracticeItem[];
  const answered = items.filter((item) => item.outcome !== null);
  const count = (outcome: Outcome) => answered.filter((item) => item.outcome === outcome).length;
  const correct = count("correct");
  const partial = count("partial");
  const incorrect = count("incorrect");
  const skipped = count("skipped");
  const scored = correct + partial + incorrect;
  const completionRate = items.length ? Math.round((answered.length / items.length) * 100) : 0;
  const successRate = scored ? Math.round((correct / scored) * 100) : null;

  // Weekly trend is based only on saved outcomes with timestamps. A week with
  // fewer than three scored answers is displayed but not interpreted.
  const now = new Date();
  const currentMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  currentMonday.setUTCDate(currentMonday.getUTCDate() - ((currentMonday.getUTCDay() + 6) % 7));
  const weeklyTrend = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentMonday);
    start.setUTCDate(start.getUTCDate() - (7 * (7 - index)));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const weekItems = answered.filter((item) => {
      if (!item.answered_at) return false;
      const timestamp = new Date(item.answered_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
    });
    const weekCorrect = weekItems.filter((item) => item.outcome === "correct").length;
    const weekPartial = weekItems.filter((item) => item.outcome === "partial").length;
    const weekIncorrect = weekItems.filter((item) => item.outcome === "incorrect").length;
    const weekScored = weekCorrect + weekPartial + weekIncorrect;
    return {
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
      total: weekItems.length,
      scored: weekScored,
      correctRate: weekScored ? Math.round((weekCorrect / weekScored) * 100) : null,
      needsMoreData: weekScored < 3,
    };
  });
  const trendWeeksWithData = weeklyTrend.filter((week) => week.scored >= 3);
  const trendFirst = trendWeeksWithData[0];
  const trendLast = trendWeeksWithData[trendWeeksWithData.length - 1];
  const trendChange = trendFirst && trendLast && trendFirst.key !== trendLast.key
    ? trendLast.correctRate! - trendFirst.correctRate!
    : null;

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
        <div className="section-heading"><div><p className="eyebrow">ALL RECORDED ATTEMPTS</p><h2>Overall snapshot</h2></div><span className="section-count">Latest 3,000 saved question results</span></div>
        {setOverflow || itemOverflow ? <p className="notice notice-error" role="status">This account has more practice history than the analytics sample displays. {setOverflow ? "Older sessions beyond the latest 300 are excluded. " : ""}{itemOverflow ? "Older question results beyond the latest 3,000 are excluded. " : ""}The figures below describe this recent sample, not your complete history.</p> : null}
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{visibleSets.length}</span><h3>Practice sets</h3><p>Latest 300 saved sessions.</p></article>
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
        <div className="section-heading"><div><p className="eyebrow">PROGRESS OVER TIME</p><h2>Weekly practice trend</h2></div><span className="section-count">Last 8 weeks</span></div>
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
            ? <p className="question-card-meta">There are not yet two separate weeks with enough scored attempts to compare. Keep recording results; no trend will be inferred from sparse data.</p>
            : <p className="question-card-meta">The displayed change compares the earliest and latest weeks with at least three scored attempts in this eight-week window. It is descriptive, not a prediction of future performance.</p>}
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
        {!visibleSets.length ? <div className="empty-state"><p>No saved practice sessions yet.</p></div> : (
          <div className="question-list">
            {visibleSets.slice(0, 12).map((set) => (
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
      <p className="question-card-meta">Coverage note: outcome analytics use up to the latest 3,000 saved question snapshots; the recent-session list shows up to 300 sets. Overflow is detected and reported above. A topic without mapped subject/chapter/topic metadata is grouped under an unmapped label. No AI grading or mastery prediction is performed.</p>
    </main>
  );
}
