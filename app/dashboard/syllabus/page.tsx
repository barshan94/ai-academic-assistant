import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import {
  createSyllabusCatalog,
  createSyllabusChapter,
  createSyllabusTopic,
  retireSyllabusCatalog,
  verifySyllabusCatalog,
} from "./actions";

type PageProps = {
  searchParams: Promise<{
    catalog?: string;
    chapter?: string;
    topic?: string;
  }>;
};

const statusMessages: Record<string, string> = {
  created: "Saved successfully.",
  verified: "This syllabus version is now marked verified.",
  retired: "This syllabus version is retired. Existing question references are preserved.",
  duplicate: "This entry already exists in your catalogue.",
  invalid: "Some fields are invalid. Check the values and try again.",
  save_failed: "Could not save this entry. Please check the values and try again.",
  not_found: "The selected parent entry was not found in your account.",
  source_required: "Add an official HTTPS source URL before marking a syllabus version verified.",
};

function Notice({ value, label }: { value?: string; label: string }) {
  if (!value) return null;
  const message = statusMessages[value];
  return message ? <p className={value === "save_failed" || value === "invalid" ? "notice notice-error" : "notice notice-info"} role="status">{label}: {message}</p> : null;
}

export default async function SyllabusPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: catalogs, error: catalogError } = await supabase.from("syllabus_catalogs")
    .select("id,board,qualification,subject,version,effective_from,effective_to,source_url,source_title,source_checked_at,status,created_at")
    .eq("owner_id", user.id).order("created_at", { ascending: false });
  const catalogIds = (catalogs ?? []).map((item) => item.id);
  const { data: chapters, error: chapterError } = catalogIds.length
    ? await supabase.from("syllabus_chapters").select("id,catalog_id,title,chapter_code,sort_order")
      .eq("owner_id", user.id).in("catalog_id", catalogIds).order("sort_order").order("title")
    : { data: [] as { id: string; catalog_id: string; title: string; chapter_code: string | null; sort_order: number }[], error: null };
  const chapterIds = (chapters ?? []).map((item) => item.id);
  const { data: topics, error: topicError } = chapterIds.length
    ? await supabase.from("syllabus_topics").select("id,chapter_id,title,topic_code,sort_order")
      .eq("owner_id", user.id).in("chapter_id", chapterIds).order("sort_order").order("title")
    : { data: [] as { id: string; chapter_id: string; title: string; topic_code: string | null; sort_order: number }[], error: null };

  const chapterCount = chapters?.length ?? 0;
  const topicCount = topics?.length ?? 0;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Question bank</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">SYLLABUS INTELLIGENCE · M5</p>
        <h1>Your syllabus <span>catalogue.</span></h1>
        <p className="hero-copy">Build a versioned reference for each board, qualification and subject. Add chapters and topics underneath it, then attach questions to the exact version instead of relying on free-text labels.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Back to question bank</Link>
        </div>
      </section>

      <Notice value={params.catalog} label="Syllabus version" />
      <Notice value={params.chapter} label="Chapter" />
      <Notice value={params.topic} label="Topic" />

      {catalogError || chapterError || topicError ? <p className="notice notice-error">Some catalogue data could not be loaded. Refresh the page or check the database connection.</p> : null}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">REFERENCE DATA</p><h2>Create a syllabus version</h2></div>
          <span className="section-count">{catalogs?.length ?? 0} versions · {chapterCount} chapters · {topicCount} topics</span>
        </div>
        <div className="syllabus-create-panel">
          <p className="question-card-meta">A separate record is kept for each syllabus version. Use the exact board and qualification names. A version remains a draft until you add a source and explicitly mark it verified.</p>
          <form action={createSyllabusCatalog} className="review-form">
            <div className="question-fields">
              <label>Exam board<input name="board" required maxLength={100} placeholder="e.g. Pearson Edexcel" /></label>
              <label>Qualification<input name="qualification" required maxLength={100} placeholder="e.g. International GCSE" /></label>
              <label>Subject<input name="subject" required maxLength={120} placeholder="e.g. Physics" /></label>
              <label>Syllabus version<input name="version" required maxLength={80} placeholder="e.g. 4PH1 (2025–2027)" /></label>
              <label>Effective from<input name="effectiveFrom" type="date" /></label>
              <label>Effective to<input name="effectiveTo" type="date" /></label>
              <label>Official source URL<input name="sourceUrl" type="url" maxLength={2048} placeholder="https://..." /></label>
              <label>Source title<input name="sourceTitle" maxLength={200} placeholder="Specification PDF / official page" /></label>
            </div>
            <button className="primary-action" type="submit">Add syllabus version →</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">YOUR REFERENCES</p><h2>Versions and chapter structure</h2></div></div>
        {!catalogs?.length ? (
          <div className="empty-state"><h3>No syllabus versions yet</h3><p>Create a version above. This catalogue starts empty intentionally; the app will not invent official board specifications or chapter mappings.</p></div>
        ) : (
          <div className="syllabus-catalog-list">
            {catalogs.map((catalog) => {
              const catalogChapters = (chapters ?? []).filter((chapter) => chapter.catalog_id === catalog.id);
              return (
                <article className="syllabus-catalog-card" key={catalog.id}>
                  <div className="question-card-heading">
                    <span className="document-status">{catalog.status}</span>
                    <span className="question-subject">{catalog.version}</span>
                  </div>
                  <h3>{catalog.board} · {catalog.qualification}</h3>
                  <p className="question-card-meta">{catalog.subject}{catalog.effective_from ? " · From " + catalog.effective_from : ""}{catalog.effective_to ? " · To " + catalog.effective_to : ""}</p>
                  {catalog.source_url ? <p className="question-card-meta"><a className="document-open" href={catalog.source_url} target="_blank" rel="noreferrer">{catalog.source_title || "Open official source"} ↗</a></p> : <p className="question-card-meta">No source recorded yet.</p>}
                  {catalog.status === "draft" ? (
                    <div className="syllabus-inline-actions">
                      <form action={verifySyllabusCatalog}><input type="hidden" name="catalogId" value={catalog.id} /><button className="document-action" type="submit" disabled={!catalog.source_url}>Mark verified</button></form>
                      <form action={retireSyllabusCatalog}><input type="hidden" name="catalogId" value={catalog.id} /><button className="document-action document-action-muted" type="submit">Retire version</button></form>
                    </div>
                  ) : catalog.status === "verified" ? (
                    <form action={retireSyllabusCatalog}><input type="hidden" name="catalogId" value={catalog.id} /><button className="document-action document-action-muted" type="submit">Retire version</button></form>
                  ) : null}

                  <div className="syllabus-children">
                    <h4>Chapters ({catalogChapters.length})</h4>
                    {catalogChapters.map((chapter) => {
                      const chapterTopics = (topics ?? []).filter((topic) => topic.chapter_id === chapter.id);
                      return (
                        <div className="syllabus-chapter" key={chapter.id}>
                          <div className="question-card-heading"><strong>{chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}</strong><span className="section-count">{chapterTopics.length} topics</span></div>
                          {chapterTopics.length ? <ul className="syllabus-topic-list">{chapterTopics.map((topic) => <li key={topic.id}>{topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}</li>)}</ul> : <p className="question-card-meta">No topics yet.</p>}
                          <form action={createSyllabusTopic} className="syllabus-add-form">
                            <input type="hidden" name="chapterId" value={chapter.id} />
                            <label>New topic<input name="title" required maxLength={160} placeholder="e.g. Moments" /></label>
                            <label>Code<input name="code" maxLength={40} placeholder="Optional" /></label>
                            <label>Order<input name="sortOrder" type="number" min="0" max="10000" defaultValue={chapterTopics.length + 1} /></label>
                            <button className="document-action" type="submit">Add topic</button>
                          </form>
                        </div>
                      );
                    })}
                    <form action={createSyllabusChapter} className="syllabus-add-form">
                      <input type="hidden" name="catalogId" value={catalog.id} />
                      <label>New chapter<input name="title" required maxLength={160} placeholder="e.g. Forces and motion" /></label>
                      <label>Code<input name="code" maxLength={40} placeholder="Optional" /></label>
                      <label>Order<input name="sortOrder" type="number" min="0" max="10000" defaultValue={catalogChapters.length + 1} /></label>
                      <button className="document-action" type="submit">Add chapter</button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
