import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../../actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function SharedSyllabusReferenceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: catalog } = await supabase.from("reference_syllabus_catalogs")
    .select("id,board,qualification,subject,version,effective_from,effective_to,source_url,source_title,source_checked_at,verified_at")
    .eq("id", id).eq("status", "verified").maybeSingle();
  if (!catalog) notFound();

  const { data: chapters, error: chapterError } = await supabase.from("reference_syllabus_chapters")
    .select("id,catalog_id,title,chapter_code,sort_order")
    .eq("catalog_id", id).order("sort_order").order("title");
  const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
  const [{ data: topics, error: topicError }, { data: evidence, error: evidenceError }] = await Promise.all([
    chapterIds.length
      ? supabase.from("reference_syllabus_topics").select("id,chapter_id,title,topic_code,sort_order")
        .in("chapter_id", chapterIds).order("sort_order").order("title")
      : Promise.resolve({ data: [] as { id: string; chapter_id: string; title: string; topic_code: string | null; sort_order: number }[], error: null }),
    supabase.from("reference_syllabus_evidence")
      .select("id,catalog_id,chapter_id,topic_id,source_url,source_title,source_locator,evidence_excerpt,created_at")
      .eq("catalog_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus/references">Reference library</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus">My catalogue</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">CURATED REFERENCE · {catalog.board}</p>
        <h1>{catalog.subject} <span>{catalog.version}</span></h1>
        <p className="hero-copy">{catalog.qualification} · {catalog.effective_from ?? "Effective date not recorded"}{catalog.effective_to ? " – " + catalog.effective_to : ""}</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus/references">Back to reference library</Link>
          {catalog.source_url ? <a className="primary-action" href={catalog.source_url} target="_blank" rel="noreferrer">Open board source ↗</a> : null}
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">PROVENANCE</p><h2>Source record</h2></div><span className="document-status">Curator verified</span></div>
        <div className="reference-provenance">
          <p><strong>{catalog.source_title ?? "Source title not recorded"}</strong></p>
          {catalog.source_url ? <a href={catalog.source_url} target="_blank" rel="noreferrer">{catalog.source_url}</a> : null}
          <p className="question-card-meta">Source checked: {catalog.source_checked_at?.slice(0, 10) ?? "Not recorded"} · Curator verification: {catalog.verified_at?.slice(0, 10) ?? "Not recorded"}</p>
          <p className="question-card-meta">“Curator verified” means a platform administrator reviewed the source record and chapter/topic evidence. It is not a guarantee that the board has not since changed the specification.</p>
        </div>
      </section>

      {chapterError || topicError || evidenceError ? <p className="notice notice-error">Some chapter or evidence details could not be loaded.</p> : null}
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">STRUCTURE</p><h2>Chapters and topics</h2></div><span className="section-count">{chapters?.length ?? 0} chapters · {topics?.length ?? 0} topics</span></div>
        {!chapters?.length ? <div className="empty-state"><h3>No chapters in this reference</h3></div> : (
          <div className="reference-chapter-list">
            {chapters.map((chapter) => {
              const chapterTopics = (topics ?? []).filter((topic) => topic.chapter_id === chapter.id);
              const chapterEvidence = (evidence ?? []).filter((item) => item.chapter_id === chapter.id && item.topic_id === null);
              return (
                <article className="reference-chapter-card" key={chapter.id}>
                  <div className="reference-card-top"><span className="section-count">{chapter.chapter_code ?? "Chapter"}</span><span>{chapterTopics.length} topics</span></div>
                  <h3>{chapter.title}</h3>
                  {chapterEvidence.map((item) => (
                    <div className="reference-evidence-item" key={item.id}>
                      <p><strong>{item.source_title}</strong>{item.source_locator ? " · " + item.source_locator : ""}</p>
                      <a href={item.source_url} target="_blank" rel="noreferrer">Open cited source ↗</a>
                      {item.evidence_excerpt ? <p className="question-card-meta">{item.evidence_excerpt}</p> : null}
                    </div>
                  ))}
                  {chapterTopics.length ? <div className="reference-topic-list">{chapterTopics.map((topic) => {
                    const topicEvidence = (evidence ?? []).filter((item) => item.topic_id === topic.id);
                    return (
                      <div className="reference-topic-item" key={topic.id}>
                        <div><strong>{topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}</strong></div>
                        {topicEvidence.map((item) => (
                          <div className="reference-evidence-item" key={item.id}>
                            <p><strong>{item.source_title}</strong>{item.source_locator ? " · " + item.source_locator : ""}</p>
                            <a href={item.source_url} target="_blank" rel="noreferrer">Open cited source ↗</a>
                            {item.evidence_excerpt ? <p className="question-card-meta">{item.evidence_excerpt}</p> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}</div> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
