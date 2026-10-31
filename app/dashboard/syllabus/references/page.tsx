import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function SharedSyllabusReferencesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: isAdmin }, { data: catalogs, error }] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    supabase.from("reference_syllabus_catalogs")
      .select("id,board,qualification,subject,version,effective_from,effective_to,source_url,source_title,source_checked_at")
      .eq("status", "verified")
      .order("board").order("qualification").order("subject").order("version"),
  ]);

  const catalogIds = (catalogs ?? []).map((catalog) => catalog.id);
  let chapters: { id: string; catalog_id: string; title: string }[] = [];
  let topics: { id: string; chapter_id: string }[] = [];
  if (catalogIds.length) {
    const { data } = await supabase.from("reference_syllabus_chapters")
      .select("id,catalog_id,title").in("catalog_id", catalogIds).order("sort_order").order("title");
    chapters = data ?? [];
  }
  const chapterIds = chapters.map((chapter) => chapter.id);
  if (chapterIds.length) {
    const { data } = await supabase.from("reference_syllabus_topics")
      .select("id,chapter_id").in("chapter_id", chapterIds);
    topics = data ?? [];
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus">My catalogue</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">CENTRAL REFERENCE LIBRARY · M5</p>
        <h1>Shared syllabus <span>references.</span></h1>
        <p className="hero-copy">Browse centrally curated syllabus versions. Only references reviewed by a platform curator are visible here; each published chapter and topic carries its own source citation.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus">Back to my catalogue</Link>
          {isAdmin ? <Link className="primary-action" href="/dashboard/syllabus/references/manage">Open curator workspace →</Link> : null}
        </div>
      </section>

      {params.error === "admin" ? <p className="notice notice-error" role="alert">The curator workspace is restricted to appointed platform administrators.</p> : null}
      {error ? <p className="notice notice-error" role="alert">The shared reference library could not be loaded.</p> : null}

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">PUBLISHED REFERENCES</p><h2>Verified syllabus versions</h2></div>
          <span className="section-count">{catalogs?.length ?? 0} published</span>
        </div>
        {!catalogs?.length ? (
          <div className="empty-state">
            <h3>No shared syllabus has been published yet</h3>
            <p>The shared library is intentionally empty until a platform curator records official-board sources and evidence for every chapter and topic. Your private catalogues are unaffected.</p>
            {isAdmin ? <Link className="primary-action" href="/dashboard/syllabus/references/manage">Create the first curated reference →</Link> : null}
          </div>
        ) : (
          <div className="reference-catalog-grid">
            {catalogs.map((catalog) => {
              const catalogChapters = chapters.filter((chapter) => chapter.catalog_id === catalog.id);
              const catalogTopics = topics.filter((topic) => catalogChapters.some((chapter) => chapter.id === topic.chapter_id));
              return (
                <article className="reference-catalog-card" key={catalog.id}>
                  <div className="reference-card-top"><span className="document-status">Curator verified</span><span className="section-count">{catalog.version}</span></div>
                  <p className="eyebrow">{catalog.board} · {catalog.qualification}</p>
                  <h3>{catalog.subject}</h3>
                  <p className="question-card-meta">{catalog.effective_from ?? "Effective date not recorded"}{catalog.effective_to ? " – " + catalog.effective_to : ""}</p>
                  <div className="reference-card-stats">
                    <span>{catalogChapters.length} chapters</span><span>{catalogTopics.length} topics</span>
                  </div>
                  <p className="question-card-meta">Source: {catalog.source_title ?? "Source title not recorded"}</p>
                  <Link className="document-open" href={"/dashboard/syllabus/references/" + catalog.id}>View syllabus and evidence ↗</Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
