import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";
import { recordPracticeAnswer } from "../actions";
import { PrintPracticeButton } from "../print-button";
import type { DatabaseWithPractice } from "@/types/practice-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ save?: string }> };

const outcomeLabels = {
  correct: "Solved correctly",
  partial: "Partially solved",
  incorrect: "Could not solve",
  skipped: "Skipped",
} as const;

export default async function PracticeDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithPractice>;
  const [{ data: set, error: setError }, { data: items, error: itemsError }] = await Promise.all([
    db.from("practice_sets").select("id,title,question_count,status,created_at,completed_at,subject,chapter,topic")
      .eq("id", id).eq("owner_id", user.id).maybeSingle(),
    db.from("practice_set_items").select("id,position,question_text,question_number,subject,chapter,topic,outcome,response_notes,answered_at")
      .eq("practice_set_id", id).eq("owner_id", user.id).order("position", { ascending: true }),
  ]);
  if (!set && !setError) notFound();
  const message = query.save === "updated" ? "Practice result saved."
    : query.save === "failed" ? "Could not save this result."
    : undefined;
  const completed = (items ?? []).filter((item) => item.outcome !== null).length;
  const correct = (items ?? []).filter((item) => item.outcome === "correct").length;
  const partial = (items ?? []).filter((item) => item.outcome === "partial").length;
  const incorrect = (items ?? []).filter((item) => item.outcome === "incorrect").length;
  const skipped = (items ?? []).filter((item) => item.outcome === "skipped").length;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/practice">Practice history</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="hero documents-hero practice-print-header">
        <p className="eyebrow">PRACTICE SESSION · {set?.status.replace("_"," ").toUpperCase()}</p>
        <h1>{set?.title}</h1>
        <p className="hero-copy">{set?.question_count} saved questions · {completed} of {set?.question_count} marked. Record your own result after attempting each question; this is self-assessment, not automatic grading.</p>
        <div className="hero-actions"><Link className="sign-in-link" href="/dashboard/practice">Back to practice history</Link><PrintPracticeButton /></div>
      </section>
      {message ? <p className={query.save === "updated" ? "notice notice-info" : "notice notice-error"} role="status">{message}</p> : null}
      {setError || itemsError ? <p className="notice notice-error">Could not load this practice session.</p> : null}
      <section className="section">
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{correct}</span><h3>Correct</h3><p>Self-marked correct answers.</p></article>
          <article className="module-card"><span className="module-number">{partial}</span><h3>Partial</h3><p>Partially solved questions.</p></article>
          <article className="module-card"><span className="module-number">{incorrect}</span><h3>Incorrect</h3><p>Questions needing more work.</p></article>
          <article className="module-card"><span className="module-number">{skipped}</span><h3>Skipped</h3><p>Questions not attempted.</p></article>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">QUESTION SNAPSHOTS</p><h2>Work through your set</h2></div><span className="section-count">{completed}/{items?.length ?? 0} recorded</span></div>
        <div className="question-list practice-print-area">
          {(items ?? []).map((item)=>(
            <article className="question-card" key={item.id}>
              <div className="question-card-heading"><span className="document-status">Question {item.position} · {item.outcome ? outcomeLabels[item.outcome] : "Awaiting result"}</span><span className="question-subject">{item.subject ?? "Subject not set"}</span></div>
              <p className="question-card-text">{item.question_number ? item.question_number + ". " : ""}{item.question_text}</p>
              <p className="question-card-meta">{[item.chapter,item.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"}</p>
              {item.outcome ? <p className="question-card-meta">Last recorded: {outcomeLabels[item.outcome]}{item.response_notes ? " · " + item.response_notes : ""} · {item.answered_at ? new Date(item.answered_at).toLocaleString() : ""}</p> : null}
              <form action={recordPracticeAnswer} className="revision-rating-form">
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="setId" value={id} />
                <label htmlFor={"outcome-"+item.id}>Your result</label>
                <select id={"outcome-"+item.id} name="outcome" defaultValue={item.outcome ?? ""} required>
                  <option value="" disabled>Choose result</option>
                  <option value="correct">Solved correctly</option>
                  <option value="partial">Partially solved</option>
                  <option value="incorrect">Could not solve</option>
                  <option value="skipped">Skipped</option>
                </select>
                <label htmlFor={"notes-"+item.id}>Notes (optional)</label>
                <textarea id={"notes-"+item.id} name="notes" maxLength={4000} rows={2} defaultValue={item.response_notes ?? ""} placeholder="What was difficult? What should you revisit?" />
                <button className="document-action" type="submit">Save result</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
