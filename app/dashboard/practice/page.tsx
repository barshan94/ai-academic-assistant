import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { createPracticeSet } from "./actions";
import type { DatabaseWithPractice } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PracticePageProps = { searchParams: Promise<{ create?: string }> };

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;

  const [{ data: questions, error: questionError }, { data: sets, error: setsError }] = await Promise.all([
    supabase.from("questions").select("id,subject,chapter,topic")
      .eq("owner_id", user.id).eq("review_status", "approved").order("created_at", { ascending: false }).limit(500),
    db.from("practice_sets").select("id,title,subject,chapter,topic,question_count,status,created_at,completed_at")
      .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const unique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort((a,b) => a.localeCompare(b));
  const subjects = unique((questions ?? []).map((q) => q.subject));
  const chapters = unique((questions ?? []).map((q) => q.chapter));
  const topics = unique((questions ?? []).map((q) => q.topic));
  const message = params.create === "invalid" ? "Check the title and choose between 1 and 50 questions."
    : params.create === "no-questions" ? "No approved questions match those filters."
    : params.create === "not-enough" ? "There are fewer matching approved questions than the requested set size."
    : params.create === "failed" ? "The practice set could not be created."
    : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/study-plan">Daily study plan</Link>
          <Link className="sign-in-link" href="/dashboard/practice/insights">Practice insights</Link>
          <Link className="sign-in-link" href="/dashboard/revision">Revision tracker</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · PRACTICE</p>
        <h1>Build a <span>practice set.</span></h1>
        <p className="hero-copy">Create a focused session from your own approved question bank. Questions are selected from your library and saved as a snapshot so later edits do not rewrite your practice history.</p>
        <div className="hero-actions"><Link className="primary-action" href="/dashboard/practice/insights">View cross-session insights →</Link></div>
      </section>
      {message ? <p className="notice notice-error" role="status">{message}</p> : null}
      {questionError || setsError ? <p className="notice notice-error">Some practice data could not be loaded.</p> : null}
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">NEW SESSION</p><h2>Choose your focus</h2></div><span className="section-count">{questions?.length ?? 0} approved questions available in filter list</span></div>
        <form action={createPracticeSet} className="document-filter-form">
          <label>Practice set name<input name="title" required maxLength={120} defaultValue="Focused practice" /></label>
          <label>Subject<select name="subject" defaultValue=""><option value="">Any subject</option>{subjects.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
          <label>Chapter<select name="chapter" defaultValue=""><option value="">Any chapter</option>{chapters.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
          <label>Topic<select name="topic" defaultValue=""><option value="">Any topic</option>{topics.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
          <label>Number of questions<select name="count" defaultValue="10">{[5,10,15,20,30,50].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
          <button className="primary-action" type="submit" disabled={!questions?.length}>Generate practice set →</button>
        </form>
        <p className="question-card-meta">Filters are applied together. Only your approved questions are eligible. The selector lists are based on the latest 500 approved questions; the server rechecks ownership and approval before saving.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">SAVED WORK</p><h2>Practice history</h2></div><span className="section-count">{sets?.length ?? 0} recent sets</span></div>
        {!sets?.length ? <div className="empty-state"><h3>No practice sessions yet</h3><p>Your completed and in-progress practice sets will appear here.</p></div> : (
          <div className="question-list">
            {sets.map((set)=>(
              <article className="question-card" key={set.id}>
                <div className="question-card-heading"><span className="document-status">{set.status.replace("_"," ")}</span><span className="question-subject">{set.question_count} questions</span></div>
                <h3>{set.title}</h3>
                <p className="question-card-meta">{[set.subject,set.chapter,set.topic].filter(Boolean).join(" · ") || "Mixed topics"} · Created {new Date(set.created_at).toLocaleString()}</p>
                <div className="question-card-footer"><Link className="document-open" href={"/dashboard/practice/"+set.id}>Open practice history ↗</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
