import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";
import type { DatabaseWithRevision } from "@/types/revision-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type TopicGroup = {
  key: string;
  subject: string;
  chapter: string;
  topic: string;
  total: number;
  rated: number;
  lowConfidence: number;
  due: number;
  confidenceTotal: number;
};

function groupLabel(value: string | null): string {
  return value?.trim() || "Not specified";
}

export default async function RevisionInsightsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const db = supabase as unknown as SupabaseClient<DatabaseWithRevision>;
  const [{ data: questions, error: questionError }, { data: progress, error: progressError }] = await Promise.all([
    db.from("questions")
      .select("id,subject,chapter,topic,created_at", { count: "exact" })
      .eq("owner_id", user.id)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1001),
  ]);

  const questionsLimited = (questions ?? []).length > 1000;
  const visibleQuestions = (questions ?? []).slice(0, 1000);
  const questionIds = visibleQuestions.map((question) => question.id);
  const { data: progress, error: progressError } = questionIds.length
    ? await db.from("question_revision_progress")
      .select("question_id,confidence,next_review_at")
      .eq("owner_id", user.id)
      .in("question_id", questionIds)
    : { data: [], error: null };

  const now = Date.now();
  const progressByQuestion = new Map((progress ?? []).map((item) => [item.question_id, item]));
  const groups = new Map<string, TopicGroup>();
  let unmapped = 0;

  for (const question of visibleQuestions) {
    const subject = groupLabel(question.subject);
    const chapter = groupLabel(question.chapter);
    const topic = groupLabel(question.topic);
    if (chapter === "Not specified" && topic === "Not specified") {
      unmapped += 1;
      continue;
    }

    const key = [subject, chapter, topic].join("::");
    const group = groups.get(key) ?? {
      key, subject, chapter, topic, total: 0, rated: 0,
      lowConfidence: 0, due: 0, confidenceTotal: 0,
    };
    group.total += 1;

    const item = progressByQuestion.get(question.id);
    if (item) {
      group.rated += 1;
      group.confidenceTotal += item.confidence;
      if (item.confidence <= 2) group.lowConfidence += 1;
      if (new Date(item.next_review_at).getTime() <= now) group.due += 1;
    }
    groups.set(key, group);
  }

  const topics = [...groups.values()].sort((a, b) => {
    const aAverage = a.rated ? a.confidenceTotal / a.rated : Number.POSITIVE_INFINITY;
    const bAverage = b.rated ? b.confidenceTotal / b.rated : Number.POSITIVE_INFINITY;
    if (a.rated !== b.rated) return b.rated - a.rated;
    return aAverage - bAverage || b.due - a.due || a.subject.localeCompare(b.subject);
  });

  const tracked = topics.reduce((sum, item) => sum + item.rated, 0);
  const lowConfidence = topics.reduce((sum, item) => sum + item.lowConfidence, 0);
  const due = topics.reduce((sum, item) => sum + item.due, 0);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/revision">Revision tracker</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · TOPIC INSIGHTS</p>
        <h1>Find your <span>revision gaps.</span></h1>
        <p className="hero-copy">Compare your latest self-reported confidence across syllabus topics. These signals are based only on approved questions you have rated; unrated questions are not treated as weaknesses.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/revision">Back to revision queue</Link>
        </div>
      </section>

      {questionError || progressError ? <p className="notice notice-error">Some revision insight data could not be loaded. Refresh the page to try again.</p> : null}
      {questionsLimited ? <p className="notice notice-info" role="status">Topic insights are based on the latest 1,000 of {approvedQuestionCount ?? "more than 1,000"} approved questions. Older questions are not included in these topic signals yet.</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">YOUR SELF-REPORTED SIGNALS</p><h2>Topic overview</h2></div><span className="section-count">{topics.length} mapped groups</span></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{topics.length}</span><h3>Mapped groups</h3><p>Subject, chapter and topic combinations with approved questions.</p></article>
          <article className="module-card"><span className="module-number">{tracked}</span><h3>Rated questions</h3><p>Questions with at least one confidence rating.</p></article>
          <article className="module-card"><span className="module-number">{lowConfidence}</span><h3>Low confidence</h3><p>Latest ratings of 1 or 2 out of 5.</p></article>
          <article className="module-card"><span className="module-number">{due}</span><h3>Due for review</h3><p>Rated questions whose next review date has arrived.</p></article>
        </div>
        <p className="question-card-meta">Analysis covers {visibleQuestions.length} of {approvedQuestionCount ?? visibleQuestions.length} approved questions, with the newest questions first. {unmapped} questions without chapter or topic metadata are excluded from topic grouping.</p>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">WHERE TO FOCUS</p><h2>Topic-by-topic breakdown</h2></div></div>
        {topics.length === 0 ? (
          <div className="empty-state"><h3>No mapped topics yet</h3><p>Approve questions and add chapter or topic metadata in your question library. The insights page will group them automatically.</p><Link className="primary-action" href="/dashboard/questions">Open question library →</Link></div>
        ) : (
          <div className="question-list">
            {topics.map((item) => {
              const average = item.rated ? item.confidenceTotal / item.rated : null;
              const signal = item.rated < 2 ? "Not enough ratings"
                : average !== null && average <= 2.5 ? "Needs another look"
                : average !== null && average < 3.5 ? "Developing confidence"
                : "Self-rated confident";
              return (
                <article className="question-card" key={item.key}>
                  <div className="question-card-heading">
                    <span className="document-status">{signal}</span>
                    <span className="question-subject">{item.subject}</span>
                  </div>
                  <h3>{item.chapter}{item.topic !== "Not specified" ? " · " + item.topic : ""}</h3>
                  <p className="question-card-meta">{item.total} approved questions · {item.rated} rated · {item.lowConfidence} latest ratings at 1–2 · {item.due} due now</p>
                  <p className="question-card-meta">{average === null ? "No confidence data yet" : "Average latest confidence: " + average.toFixed(1) + "/5"} · Ratings are personal estimates, not verified mastery.</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
