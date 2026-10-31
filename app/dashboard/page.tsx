import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></span>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/teacher-invites">Teacher invitations</Link>
          <Link className="sign-in-link" href="/dashboard/questions">Questions</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus">Syllabus</Link>
          <Link className="sign-in-link" href="/dashboard/documents">Documents</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="hero dashboard-hero">
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Your learning hub<span>.</span></h1>
        <p className="hero-copy">You are signed in as {user.email ?? "the account owner"}. Build your source library, generate answer drafts when a provider is configured, and collaborate with invited teachers.</p>
        <div className="hero-actions">
          <Link className="primary-action" href="/dashboard/documents">Open document library <span aria-hidden="true">→</span></Link>
          <Link className="sign-in-link" href="/dashboard/questions">Open question library</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus">Manage syllabus references</Link>
          <Link className="sign-in-link" href="/dashboard/chapters">Open chapter workspace</Link>
          <Link className="sign-in-link" href="/dashboard/revision">Open revision tracker</Link>
          <Link className="sign-in-link" href="/dashboard/revision/insights">Topic revision insights</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus/review">Classification review queue</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus/references">Shared syllabus library</Link>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">CURRENT BUILD</p><h2>Working modules</h2></div>
          <span className="section-count">M3 solver preview</span>
        </div>
        <div className="module-grid">
          <article className="module-card"><span className="module-number">01</span><h3>Question library</h3><p>Capture individual questions from source pages and add board, qualification, subject and chapter metadata.</p><Link className="document-open" href="/dashboard/questions">Open library ↗</Link></article>
          <article className="module-card"><span className="module-number">02</span><h3>Document intake</h3><p>Archive PDFs and image batches in Google Drive, extract text and review corrections.</p><Link className="document-open" href="/dashboard/documents">Open documents ↗</Link></article>
          <article className="module-card"><span className="module-number">03</span><h3>AI solutions & reviews</h3><p>Structured answer drafts, saved versions and question-scoped teacher feedback.</p><Link className="document-open" href="/dashboard/questions">Open solver ↗</Link></article>
          <article className="module-card"><span className="module-number">04</span><h3>Syllabus catalogue</h3><p>Versioned board, qualification, subject, chapter and topic references with source review.</p><Link className="document-open" href="/dashboard/syllabus">Manage references ↗</Link></article>
          <article className="module-card"><span className="module-number">05</span><h3>Chapter intelligence</h3><p>Build structured, source-linked notes with immutable versions and owner approval.</p><Link className="document-open" href="/dashboard/chapters">Open workspace ↗</Link></article>
          <article className="module-card"><span className="module-number">06</span><h3>Revision tracker</h3><p>Rate your confidence on approved questions and schedule the next review using spaced intervals.</p><Link className="document-open" href="/dashboard/revision">Open revision queue ↗</Link></article>
          <article className="module-card"><span className="module-number">07</span><h3>Topic gap insights</h3><p>Compare self-reported confidence across mapped syllabus topics and identify what needs another look.</p><Link className="document-open" href="/dashboard/revision/insights">View topic insights ↗</Link></article>
        </div>
      </section>
    </main>
  );
}
