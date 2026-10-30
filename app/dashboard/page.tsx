import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></span>
        <form action={signOut}>
          <button className="signout-button" type="submit">Sign out</button>
        </form>
      </header>
      <section className="hero dashboard-hero">
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1>Your learning hub<span>.</span></h1>
        <p className="hero-copy">You are signed in as {user.email ?? "the account owner"}. Your academic workspace is ready for the next development milestone.</p>
      </section>
      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">MILESTONE 1</p><h2>Foundation modules</h2></div>
          <span className="section-count">Implementation in progress</span>
        </div>
        <div className="hero-actions" style={{ marginBottom: 24 }}><Link className="primary-action" href="/dashboard/documents">Open document library <span aria-hidden="true">→</span></Link></div>\n        <div className="module-grid">
          <article className="module-card"><span className="module-number">01</span><h3>Question library</h3><p>Organise questions by board, qualification, subject and chapter.</p><span className="planned">Planned</span></article>
          <article className="module-card"><span className="module-number">02</span><h3>Document intake</h3><p>Prepare question images and PDFs for structured extraction.</p><span className="planned">Planned</span></article>
          <article className="module-card"><span className="module-number">03</span><h3>Solutions</h3><p>Create exam-ready answers with Bengali and English teaching notes.</p><span className="planned">Planned</span></article>
          <article className="module-card"><span className="module-number">04</span><h3>Chapter intelligence</h3><p>Build reusable notes, formula sheets and revision material.</p><span className="planned">Planned</span></article>
        </div>
      </section>
    </main>
  );
}
