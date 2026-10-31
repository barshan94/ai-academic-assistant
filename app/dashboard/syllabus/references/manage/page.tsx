import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../../actions";
import {
  addReferenceEvidence,
  createReferenceCatalog,
  createReferenceChapter,
  createReferenceTopic,
  retireReferenceCatalog,
  verifyReferenceCatalog,
} from "../actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ result?: string }> };

const messages: Record<string, string> = {
  created: "Draft shared syllabus created.",
  chapter_added: "Chapter added.",
  topic_added: "Topic added.",
  evidence_added: "Source evidence recorded. Evidence entries are append-only.",
  verified: "Catalogue verified and published to the shared library.",
  retired: "Catalogue retired. Its published structure remains read-only.",
  invalid: "Some submitted fields are invalid.",
  duplicate: "A catalogue, chapter or topic with that identity already exists.",
  save_failed: "Could not save the entry. Check the values and try again.",
  evidence_invalid: "Evidence needs a valid HTTPS URL, a title and fields within the length limits.",
  evidence_failed: "Evidence could not be recorded. Check the selected chapter/topic and source details.",
  verify_failed: "Verification was rejected. Add a checked HTTPS catalogue source and one citation for every chapter and every topic before publishing.",
  retire_failed: "The catalogue could not be retired. Refresh and check its current status.",
  not_found: "The selected chapter or catalogue no longer exists.",
};

function EvidenceForm({ catalogId, chapterId, topicId = "" }: { catalogId: string; chapterId: string; topicId?: string }) {
  return (
    <details className="reference-admin-evidence">
      <summary>Record source citation</summary>
      <form action={addReferenceEvidence} className="review-form">
        <input type="hidden" name="catalogId" value={catalogId} />
        <input type="hidden" name="chapterId" value={chapterId} />
        <input type="hidden" name="topicId" value={topicId} />
        <div className="question-fields">
          <label>HTTPS source URL<input type="url" name="sourceUrl" required maxLength={2048} placeholder="https://..." /></label>
          <label>Source title<input name="sourceTitle" required maxLength={200} placeholder="Official specification / syllabus" /></label>
          <label>Page or section<input name="sourceLocator" maxLength={200} placeholder="e.g. page 18, section 2.3" /></label>
        </div>
        <label>Supporting excerpt or curator note<textarea name="evidenceExcerpt" rows={2} maxLength={600} placeholder="Short evidence note; do not paste large copyrighted sections." /></label>
        <button className="document-action" type="submit">Save citation</button>
      </form>
    </details>
  );
}

export default async function SharedSyllabusCuratorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin");
  if (adminError || !isAdmin) redirect("/dashboard/syllabus/references?error=admin");

  const { data: catalogs, error: catalogError } = await supabase.from("reference_syllabus_catalogs")
    .select("id,board,qualification,subject,version,effective_from,effective_to,source_url,source_title,source_checked_at,status,created_at")
    .order("created_at", { ascending: false });
  const catalogIds = (catalogs ?? []).map((catalog) => catalog.id);
  let chapters: { id: string; catalog_id: string; title: string; chapter_code: string | null; sort_order: number }[] = [];
  let topics: { id: string; chapter_id: string; title: string; topic_code: string | null; sort_order: number }[] = [];
  let evidence: { id: string; catalog_id: string; chapter_id: string; topic_id: string | null; source_url: string; source_title: string; source_locator: string | null; evidence_excerpt: string | null }[] = [];

  if (catalogIds.length) {
    const { data } = await supabase.from("reference_syllabus_chapters")
      .select("id,catalog_id,title,chapter_code,sort_order")
      .in("catalog_id", catalogIds).order("sort_order").order("title");
    chapters = data ?? [];
  }
  const chapterIds = chapters.map((chapter) => chapter.id);
  if (chapterIds.length) {
    const [{ data: topicRows }, { data: evidenceRows }] = await Promise.all([
      supabase.from("reference_syllabus_topics").select("id,chapter_id,title,topic_code,sort_order")
        .in("chapter_id", chapterIds).order("sort_order").order("title"),
      supabase.from("reference_syllabus_evidence")
        .select("id,catalog_id,chapter_id,topic_id,source_url,source_title,source_locator,evidence_excerpt")
        .in("chapter_id", chapterIds).order("created_at", { ascending: false }),
    ]);
    topics = topicRows ?? [];
    evidence = evidenceRows ?? [];
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus/references">Public reference library</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">PLATFORM CURATION · ADMIN ONLY</p>
        <h1>Shared syllabus <span>curator.</span></h1>
        <p className="hero-copy">Create draft reference versions, attach chapter/topic-level citations, and publish only after the database confirms evidence coverage. Published structures are immutable; corrections require a new version.</p>
        <div className="hero-actions"><Link className="sign-in-link" href="/dashboard/syllabus/references">Back to public library</Link></div>
      </section>

      {params.result && messages[params.result] ? <p className={["invalid", "duplicate", "save_failed", "evidence_invalid", "evidence_failed", "verify_failed", "retire_failed", "not_found"].includes(params.result) ? "notice notice-error" : "notice notice-info"} role="status">{messages[params.result]}</p> : null}
      {catalogError ? <p className="notice notice-error">Could not load shared catalogue data.</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">NEW REFERENCE</p><h2>Create a draft catalogue</h2></div></div>
        <form action={createReferenceCatalog} className="review-form reference-admin-form">
          <div className="question-fields">
            <label>Exam board<input name="board" required maxLength={100} placeholder="e.g. Pearson Edexcel" /></label>
            <label>Qualification<input name="qualification" required maxLength={100} placeholder="e.g. International GCSE" /></label>
            <label>Subject<input name="subject" required maxLength={120} placeholder="e.g. Physics" /></label>
            <label>Syllabus version<input name="version" required maxLength={80} placeholder="e.g. 4PH1 (2025–2027)" /></label>
            <label>Effective from<input name="effectiveFrom" type="date" /></label>
            <label>Effective to<input name="effectiveTo" type="date" /></label>
            <label>Official source URL<input name="sourceUrl" type="url" maxLength={2048} placeholder="https://..." /></label>
            <label>Source title<input name="sourceTitle" maxLength={200} placeholder="Official specification PDF" /></label>
            <label>Source checked on<input name="sourceCheckedAt" type="date" /></label>
          </div>
          <p className="question-card-meta">Use the board's own official domain wherever possible. HTTPS alone does not prove that a source is official; the curator must check the publisher and document version.</p>
          <button className="primary-action" type="submit">Create draft catalogue</button>
        </form>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">CURATION QUEUE</p><h2>Shared catalogue versions</h2></div><span className="section-count">{catalogs?.length ?? 0} total</span></div>
        {!catalogs?.length ? <div className="empty-state"><h3>No shared catalogues yet</h3><p>Create the first draft above. No sample or unverified content is exposed to ordinary users.</p></div> : (
          <div className="reference-admin-list">
            {catalogs.map((catalog) => {
              const catalogChapters = chapters.filter((chapter) => chapter.catalog_id === catalog.id);
              const catalogTopics = topics.filter((topic) => catalogChapters.some((chapter) => chapter.id === topic.chapter_id));
              const chapterEvidenceCount = evidence.filter((item) => item.catalog_id === catalog.id && item.topic_id === null).length;
              const topicEvidenceCount = evidence.filter((item) => item.catalog_id === catalog.id && item.topic_id !== null).length;
              return (
                <article className="reference-admin-catalog" key={catalog.id}>
                  <div className="reference-card-top"><span className={"document-status " + (catalog.status === "verified" ? "status-verified" : "")}>{catalog.status}</span><span className="section-count">{catalog.version}</span></div>
                  <h3>{catalog.board} · {catalog.qualification} · {catalog.subject}</h3>
                  <p className="question-card-meta">Source: {catalog.source_title ?? "Not recorded"} · Checked: {catalog.source_checked_at?.slice(0, 10) ?? "Not recorded"}</p>
                  <p className="question-card-meta">{catalogChapters.length} chapters · {catalogTopics.length} topics · {chapterEvidenceCount} chapter citations · {topicEvidenceCount} topic citations</p>
                  {catalog.source_url ? <a href={catalog.source_url} target="_blank" rel="noreferrer">Open catalogue source ↗</a> : null}

                  {catalog.status === "draft" ? (
                    <>
                      <details className="reference-admin-evidence">
                        <summary>Update draft source details</summary>
                        <form action={createReferenceCatalog} className="review-form">
                          <p className="question-card-meta">Source metadata is captured when the draft is created. If it needs correction, retire this draft and create a new version with the correct source.</p>
                        </form>
                      </details>
                      <form action={createReferenceChapter} className="review-form reference-admin-inline-form">
                        <input type="hidden" name="catalogId" value={catalog.id} />
                        <label>New chapter title<input name="title" required maxLength={160} placeholder="Chapter title" /></label>
                        <label>Chapter code<input name="code" maxLength={40} placeholder="Optional code" /></label>
                        <label>Order<input name="sortOrder" type="number" min="0" max="10000" defaultValue="0" /></label>
                        <button className="document-action" type="submit">Add chapter</button>
                      </form>
                    </>
                  ) : null}

                  {catalogChapters.map((chapter) => {
                    const chapterTopics = topics.filter((topic) => topic.chapter_id === chapter.id);
                    const chapterCitationCount = evidence.filter((item) => item.chapter_id === chapter.id && item.topic_id === null).length;
                    return (
                      <details className="reference-admin-chapter" key={chapter.id}>
                        <summary><strong>{chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}</strong><span className="section-count">{chapterTopics.length} topics · {chapterCitationCount} citations</span></summary>
                        {catalog.status === "draft" ? <EvidenceForm catalogId={catalog.id} chapterId={chapter.id} /> : null}
                        {catalog.status === "draft" ? (
                          <form action={createReferenceTopic} className="review-form reference-admin-inline-form">
                            <input type="hidden" name="chapterId" value={chapter.id} />
                            <label>New topic title<input name="title" required maxLength={160} placeholder="Topic title" /></label>
                            <label>Topic code<input name="code" maxLength={40} placeholder="Optional code" /></label>
                            <label>Order<input name="sortOrder" type="number" min="0" max="10000" defaultValue="0" /></label>
                            <button className="document-action" type="submit">Add topic</button>
                          </form>
                        ) : null}
                        {chapterTopics.map((topic) => {
                          const topicCitationCount = evidence.filter((item) => item.topic_id === topic.id).length;
                          return (
                            <div className="reference-admin-topic" key={topic.id}>
                              <div className="reference-card-top"><strong>{topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}</strong><span className="section-count">{topicCitationCount} citations</span></div>
                              {catalog.status === "draft" ? <EvidenceForm catalogId={catalog.id} chapterId={chapter.id} topicId={topic.id} /> : null}
                            </div>
                          );
                        })}
                      </details>
                    );
                  })}

                  {catalog.status === "draft" ? (
                    <form action={verifyReferenceCatalog}>
                      <input type="hidden" name="catalogId" value={catalog.id} />
                      <button className="primary-action" type="submit">Verify and publish</button>
                    </form>
                  ) : null}
                  {catalog.status === "verified" ? (
                    <form action={retireReferenceCatalog}>
                      <input type="hidden" name="catalogId" value={catalog.id} />
                      <button className="document-action" type="submit">Retire version</button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
