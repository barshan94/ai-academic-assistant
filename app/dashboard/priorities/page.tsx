import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

type PriorityQuestion = {
  id: string;
  syllabus_chapter_id: string | null;
  syllabus_topic_id: string | null;
  question_text: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  question_number: string | null;
};

export default async function PrioritiesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: catalogs, error: catalogError } = await supabase.from("syllabus_catalogs")
    .select("id,board,qualification,subject,version,status")
    .eq("owner_id", user.id)
    .eq("status", "verified")
    .order("subject")
    .order("version");

  const catalogIds = (catalogs ?? []).map((catalog) => catalog.id);
  const { data: chapters, error: chapterError } = catalogIds.length
    ? await supabase.from("syllabus_chapters")
      .select("id,catalog_id,title,chapter_code,sort_order")
      .eq("owner_id", user.id)
      .in("catalog_id", catalogIds)
      .order("sort_order")
    : { data: [] as { id: string; catalog_id: string; title: string; chapter_code: string | null; sort_order: number }[], error: null };

  const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
  const { data: topics, error: topicError } = chapterIds.length
    ? await supabase.from("syllabus_topics")
      .select("id,chapter_id,title,topic_code,sort_order")
      .eq("owner_id", user.id)
      .in("chapter_id", chapterIds)
      .order("sort_order")
    : { data: [] as { id: string; chapter_id: string; title: string; topic_code: string | null; sort_order: number }[], error: null };

  const { data: questions, error: questionError } = chapterIds.length
    ? await supabase.from("questions")
      .select("id,syllabus_chapter_id,syllabus_topic_id,question_text,subject,chapter,topic,question_number")
      .eq("owner_id", user.id)
      .eq("review_status", "approved")
      .in("syllabus_chapter_id", chapterIds)
      .order("created_at", { ascending: false })
      .limit(500)
    : { data: [] as PriorityQuestion[], error: null };

  const catalogMap = new Map((catalogs ?? []).map((catalog) => [catalog.id, catalog]));
  const topicsByChapter = new Map<string, typeof topics>();
  for (const topic of topics ?? []) {
    const items = topicsByChapter.get(topic.chapter_id) ?? [];
    items.push(topic);
    topicsByChapter.set(topic.chapter_id, items);
  }
  const questionsByChapter = new Map<string, PriorityQuestion[]>();
  const questionsByTopic = new Map<string, PriorityQuestion[]>();
  for (const question of (questions ?? []) as PriorityQuestion[]) {
    if (!question.syllabus_chapter_id) continue;
    const chapterItems = questionsByChapter.get(question.syllabus_chapter_id) ?? [];
    chapterItems.push(question);
    questionsByChapter.set(question.syllabus_chapter_id, chapterItems);
    if (question.syllabus_topic_id) {
      const topicItems = questionsByTopic.get(question.syllabus_topic_id) ?? [];
      topicItems.push(question);
      questionsByTopic.set(question.syllabus_topic_id, topicItems);
    }
  }

  const priorityChapters = [...(chapters ?? [])].sort((a, b) => {
    const aTopicIds = topicsByChapter.get(a.id) ?? [];
    const bTopicIds = topicsByChapter.get(b.id) ?? [];
    const aUncovered = aTopicIds.filter((topic) => !(questionsByTopic.get(topic.id)?.length)).length;
    const bUncovered = bTopicIds.filter((topic) => !(questionsByTopic.get(topic.id)?.length)).length;
    const aQuestions = questionsByChapter.get(a.id)?.length ?? 0;
    const bQuestions = questionsByChapter.get(b.id)?.length ?? 0;
    // Surface chapters with no approved questions first, then the largest
    // number of uncovered syllabus topics, without implying exam likelihood.
    return Number(aQuestions > 0) - Number(bQuestions > 0)
      || bUncovered - aUncovered
      || (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const totalTopics = topics?.length ?? 0;
  const mappedTopics = (topics ?? []).filter((topic) => (questionsByTopic.get(topic.id)?.length ?? 0) > 0).length;
  const uncoveredTopics = totalTopics - mappedTopics;
  const loadError = catalogError || chapterError || topicError || questionError;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Question bank</Link>
          <Link className="sign-in-link" href="/dashboard/quizzes">Quiz builder</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · SYLLABUS COVERAGE</p>
        <h1>Practice <span>priorities.</span></h1>
        <p className="hero-copy">Find syllabus topics with little or no approved question-bank coverage. These are study-planning signals based on your own verified syllabus catalogue and approved questions — not predictions of what will appear in an exam.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus">Manage syllabus</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus/review">Review mappings</Link>
          <Link className="sign-in-link" href="/dashboard/quizzes">Build a practice quiz</Link>
        </div>
      </section>

      {loadError ? <p className="notice notice-error" role="alert">Some syllabus coverage data could not be loaded. The results below may be incomplete; refresh before using them to plan study.</p> : null}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">COVERAGE SNAPSHOT</p><h2>What needs more practice material?</h2></div>
          <span className="section-count">{mappedTopics} / {totalTopics} topics have approved questions</span>
        </div>
        <div className="module-grid">
          <article className="module-card"><span className="module-number">01</span><h3>{catalogs?.length ?? 0}</h3><p>Verified syllabus versions included</p></article>
          <article className="module-card"><span className="module-number">02</span><h3>{chapters?.length ?? 0}</h3><p>Chapters in those versions</p></article>
          <article className="module-card"><span className="module-number">03</span><h3>{questions?.length ?? 0}</h3><p>Approved questions linked to these chapters (maximum 500 loaded)</p></article>
          <article className="module-card"><span className="module-number">04</span><h3>{uncoveredTopics}</h3><p>Syllabus topics with no linked approved questions</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">CHAPTER-BY-CHAPTER</p><h2>Recommended practice order</h2><p className="question-card-meta">Sorted by missing approved-question coverage, not predicted exam frequency.</p></div></div>
        {!catalogs?.length ? (
          <div className="empty-state"><h3>No verified syllabus versions</h3><p>Add a syllabus, attach its official source, and verify it before coverage recommendations are calculated. Draft catalogues are intentionally excluded.</p><Link className="primary-action" href="/dashboard/syllabus">Open syllabus catalogue →</Link></div>
        ) : !chapters?.length ? (
          <div className="empty-state"><h3>No chapters in the verified syllabus</h3><p>Add chapter structure to your verified syllabus before reviewing coverage.</p><Link className="primary-action" href="/dashboard/syllabus">Manage chapters →</Link></div>
        ) : (
          <div className="chapter-workspace-list">
            {priorityChapters.map((chapter) => {
              const catalog = catalogMap.get(chapter.catalog_id);
              const chapterQuestions = questionsByChapter.get(chapter.id) ?? [];
              const chapterTopics = topicsByChapter.get(chapter.id) ?? [];
              const topicCoverage = chapterTopics.map((topic) => ({
                topic,
                questions: questionsByTopic.get(topic.id) ?? [],
              }));
              const uncovered = topicCoverage.filter((item) => item.questions.length === 0);
              const status = !chapterQuestions.length ? "No approved questions" : uncovered.length ? "Coverage gaps" : "Question coverage present";
              return (
                <article className="chapter-workspace-card" key={chapter.id}>
                  <div className="question-card-heading">
                    <span className="document-status">{status}</span>
                    <span className="question-subject">{catalog?.board} · {catalog?.qualification} · {catalog?.subject} · {catalog?.version}</span>
                  </div>
                  <h3>{chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}</h3>
                  <p className="question-card-meta">{chapterQuestions.length} approved questions · {chapterTopics.length} syllabus topics · {uncovered.length} topics without linked questions</p>
                  {chapterTopics.length ? (
                    <div className="question-list">
                      {topicCoverage.map(({ topic, questions: topicQuestions }) => (
                        <article className="question-card" key={topic.id}>
                          <div className="question-card-heading">
                            <strong>{topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}</strong>
                            <span className="document-status">{topicQuestions.length} linked questions</span>
                          </div>
                          {topicQuestions.length ? (
                            <ul>{topicQuestions.slice(0, 3).map((question) => (
                              <li key={question.id}><Link className="document-open" href={"/dashboard/questions/" + question.id}>{question.question_number ? question.question_number + ". " : ""}{question.question_text.slice(0, 180)} ↗</Link></li>
                            ))}</ul>
                          ) : <p className="question-card-meta">No approved question is linked to this syllabus topic yet. Add or classify source questions before treating this topic as covered.</p>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="question-card-meta">No topic-level syllabus structure is recorded. Chapter-level question counts cannot establish full syllabus coverage.</p>
                  )}
                  <div className="question-card-footer">
                    <Link className="document-open" href="/dashboard/questions">Add or classify questions ↗</Link>
                    <Link className="document-open" href="/dashboard/quizzes">Create practice quiz ↗</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="question-card-meta">Method: only teacher-approved questions linked to a verified, owner-managed syllabus version are counted. Question frequency is not evidence of exam likelihood. The app does not currently have enough verified past-paper year data to calculate recurrence rates or predict exam questions.</p>
    </main>
  );
}
