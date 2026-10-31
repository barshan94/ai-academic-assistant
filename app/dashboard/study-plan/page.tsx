import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { createStudySession, completeStudySession } from "./actions";
import type { DatabaseWithStudyPlan } from "@/types/study-plan-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PageProps = { searchParams: Promise<{ calendar?: string }> };
function dateKey(date: Date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function mondayOf(date: Date) { const result = new Date(date.getFullYear(), date.getMonth(), date.getDate()); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; }
function formatDay(date: Date) { return new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(date); }

export default async function StudyPlanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithStudyPlan>;
  const today = new Date();
  const weekStart = mondayOf(today);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const startKey = dateKey(weekStart), endKey = dateKey(weekEnd);
  const [{ data: sessions, error: sessionsError }, { data: revisionRows, error: revisionError }, { data: sets, error: setsError }] = await Promise.all([
    db.from("weekly_study_sessions").select("id,session_date,title,planned_minutes,notes,status,completed_at").eq("owner_id", user.id).gte("session_date", startKey).lte("session_date", endKey).order("session_date", { ascending: true }).order("created_at", { ascending: true }).limit(200),
    db.from("question_revision_progress").select("question_id,next_review_at").eq("owner_id", user.id).lte("next_review_at", new Date().toISOString()).limit(500),
    db.from("practice_sets").select("id").eq("owner_id", user.id).eq("status", "in_progress").limit(100),
  ]);
  const dueCount = revisionRows?.length ?? 0;
  const setIds = (sets ?? []).map((set) => set.id);
  let unfinishedCount = 0, itemsError: { message: string } | null = null;
  if (setIds.length) {
    const result = await db.from("practice_set_items").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("practice_set_id", setIds).is("outcome", null);
    unfinishedCount = result.count ?? 0; itemsError = result.error;
  }
  const totalMinutes = (sessions ?? []).reduce((sum, session) => sum + session.planned_minutes, 0);
  const completedMinutes = (sessions ?? []).filter((session) => session.status === "completed").reduce((sum, session) => sum + session.planned_minutes, 0);
  const completedCount = (sessions ?? []).filter((session) => session.status === "completed").length;
  const plannedCount = (sessions ?? []).length - completedCount;
  const message = params.calendar === "created" ? "Study session added to this week's calendar." : params.calendar === "completed" ? "Session marked as completed." : params.calendar === "invalid" ? "Check the date, title and planned duration." : params.calendar === "failed" ? "The session could not be saved. Refresh and try again." : undefined;
  const hasError = Boolean(sessionsError || revisionError || setsError || itemsError);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/revision">Revision tracker</Link><Link className="sign-in-link" href="/dashboard/practice">Practice sets</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · WEEKLY PLANNING</p><h1>Plan the <span>week.</span></h1>
        <p className="hero-copy">Schedule realistic study blocks, estimate the time required, and mark each block complete when you finish. Your saved sessions are private to your account.</p>
        <div className="hero-actions"><Link className="primary-action" href="/dashboard/revision">Review {dueCount} due revisions →</Link><Link className="sign-in-link" href="/dashboard/practice">Continue {unfinishedCount} unfinished practice questions</Link></div>
      </section>
      {message ? <p className={params.calendar === "failed" || params.calendar === "invalid" ? "notice notice-error" : "notice"} role="status">{message}</p> : null}
      {hasError ? <p className="notice notice-error" role="status">Some calendar or workload data could not be loaded. The displayed totals may be incomplete.</p> : null}
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">WEEK OF {startKey}</p><h2>Your weekly workload</h2></div><span className="section-count">{plannedCount} planned · {completedCount} completed</span></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{totalMinutes}</span><h3>Planned minutes</h3><p>Estimated time across this week's saved sessions.</p></article>
          <article className="module-card"><span className="module-number">{completedMinutes}</span><h3>Completed minutes</h3><p>Time estimates for sessions you marked complete.</p></article>
          <article className="module-card"><span className="module-number">{dueCount + unfinishedCount}</span><h3>Existing study tasks</h3><p>{dueCount} due revisions and {unfinishedCount} unfinished practice questions remain outside the calendar until you schedule them.</p></article>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">ADD A BLOCK</p><h2>Schedule study time</h2></div><span className="section-count">5–480 minutes</span></div>
        <form action={createStudySession} className="document-filter-form">
          <label>Date<input type="date" name="sessionDate" required min={startKey} max={endKey} defaultValue={dateKey(today)} /></label>
          <label>Session title<input name="title" required maxLength={120} placeholder="e.g. Physics — electricity revision" /></label>
          <label>Estimated minutes<select name="plannedMinutes" defaultValue="45">{[15,30,45,60,90,120,180,240].map((value)=><option key={value} value={value}>{value} minutes</option>)}</select></label>
          <label>Notes (optional)<input name="notes" maxLength={500} placeholder="Chapter, goal or materials" /></label>
          <button className="primary-action" type="submit">Add to weekly calendar →</button>
        </form>
        <p className="question-card-meta">Sessions are personal plans, not automatically generated assignments. Due revision and practice tasks remain separate until you choose to schedule them.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">MONDAY–SUNDAY</p><h2>Weekly calendar</h2></div><span className="section-count">{(sessions ?? []).length} sessions</span></div>
        <div className="study-calendar">
          {Array.from({ length: 7 }, (_, index) => {
            const day = new Date(weekStart); day.setDate(day.getDate() + index);
            const key = dateKey(day), daySessions = (sessions ?? []).filter((session) => session.session_date === key);
            const dayMinutes = daySessions.reduce((sum, session) => sum + session.planned_minutes, 0);
            return <section className="study-calendar-day" key={key}>
              <header><div><h3>{formatDay(day)}</h3><span>{key === dateKey(today) ? "Today" : key}</span></div><strong>{dayMinutes} min</strong></header>
              {!daySessions.length ? <p className="study-calendar-empty">No sessions planned</p> : daySessions.map((session) =>
                <article className={"study-session-card " + (session.status === "completed" ? "is-complete" : "")} key={session.id}>
                  <div className="question-card-heading"><span className="document-status">{session.status === "completed" ? "Completed" : "Planned"}</span><span className="question-subject">{session.planned_minutes} min</span></div>
                  <h4>{session.title}</h4>{session.notes ? <p className="question-card-meta">{session.notes}</p> : null}
                  {session.status === "planned" ? <form action={completeStudySession}><input type="hidden" name="sessionId" value={session.id} /><button className="secondary-action" type="submit">Mark complete ✓</button></form> : <p className="study-complete-note">Completed {session.completed_at ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.completed_at)) : ""}</p>}
                </article>
              )}
            </section>;
          })}
        </div>
      </section>
      <p className="question-card-meta">Calendar window: current Monday–Sunday only; up to 200 saved sessions are displayed. Time values are estimates entered by you, not measured focus time.</p>
    </main>
  );
}
