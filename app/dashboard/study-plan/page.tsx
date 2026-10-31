import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { createStudySession, completeStudySession, deletePlannedStudySession } from "./actions";
import type { DatabaseWithStudyPlan } from "@/types/study-plan-database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import StudyPlanTimezone from "./timezone";
import { addCalendarDays, dateFromKey, dateKeyInTimeZone, formatCalendarDay, isValidTimeZone, mondayOf } from "@/lib/study-plan-dates";

type PageProps = { searchParams: Promise<{ calendar?: string; week?: string; revisionPage?: string; practicePage?: string; sessionPage?: string }> };
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

export default async function StudyPlanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const db = supabase as unknown as SupabaseClient<DatabaseWithStudyPlan>;
  const cookieStore = await cookies();
  const savedTimeZone = cookieStore.get("study-plan-timezone")?.value;
  const timeZone = savedTimeZone && isValidTimeZone(savedTimeZone) ? savedTimeZone : "UTC";
  const today = dateFromKey(dateKeyInTimeZone(new Date(), timeZone));
  const requestedWeek = Number.parseInt(params.week ?? "0", 10);
  const weekOffset = Number.isFinite(requestedWeek) ? Math.max(-52, Math.min(52, requestedWeek)) : 0;
  const weekStart = mondayOf(today);
  const shiftedWeekStart = addCalendarDays(weekStart, weekOffset * 7);
  const weekEnd = addCalendarDays(shiftedWeekStart, 6);
  const calendarWeekStart = shiftedWeekStart;
  const formDefaultDate = today >= calendarWeekStart && today <= weekEnd ? today : calendarWeekStart;
  const startKey = dateKey(calendarWeekStart), endKey = dateKey(weekEnd);
  const revisionPage = Math.max(1, Math.min(10000, Number.parseInt(params.revisionPage ?? "1", 10) || 1));
  const practicePage = Math.max(1, Math.min(10000, Number.parseInt(params.practicePage ?? "1", 10) || 1));
  const sessionPage = Math.max(1, Math.min(10000, Number.parseInt(params.sessionPage ?? "1", 10) || 1));
  const [{ data: calendarData, error: calendarError }, { data: queueData, error: queueError }] = await Promise.all([
    db.rpc("get_weekly_study_sessions_page", { p_start_date: startKey, p_end_date: endKey, p_page: sessionPage, p_page_size: 50 }),
    db.rpc("get_study_queue_page", { p_revision_page: revisionPage, p_practice_page: practicePage, p_page_size: 25 }),
  ]);
  const visibleSessions = calendarData?.sessions ?? [];
  const sessionsTotal = calendarData?.sessions_total ?? 0;
  const sessionPages = Math.max(1, Math.ceil(sessionsTotal / 50));
  if (sessionPage > sessionPages) {
    const query = new URLSearchParams({ week: String(weekOffset), sessionPage: String(sessionPages), revisionPage: String(revisionPage), practicePage: String(practicePage) });
    redirect("/dashboard/study-plan?" + query.toString());
  }
  const queue = queueData;
  const dueRevisions = queue?.revision_items ?? [];
  const unfinishedItems = queue?.practice_items ?? [];
  const revisionTotal = queue?.revision_total ?? 0;
  const practiceTotal = queue?.practice_total ?? 0;
  const revisionPages = Math.max(1, Math.ceil(revisionTotal / 25));
  const practicePages = Math.max(1, Math.ceil(practiceTotal / 25));
  const totalMinutes = calendarData?.planned_minutes ?? 0;
  const completedMinutes = calendarData?.completed_minutes ?? 0;
  const completedCount = calendarData?.completed_count ?? 0;
  const plannedCount = calendarData?.planned_count ?? 0;
  const message = params.calendar === "created" ? "Study session added to this week's calendar." : params.calendar === "completed" ? "Session marked as completed." : params.calendar === "deleted" ? "Planned session removed from your calendar." : params.calendar === "invalid" ? "Check the date, title and planned duration." : params.calendar === "failed" ? "The session could not be saved. Refresh and try again." : undefined;
  const hasError = Boolean(calendarError || queueError);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/revision">Revision tracker</Link><Link className="sign-in-link" href="/dashboard/practice">Practice sets</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">EXAM PREPARATION · WEEKLY PLANNING</p><h1>Plan the <span>week.</span></h1>
        <p className="hero-copy">Schedule realistic study blocks, estimate the time required, and mark each block complete when you finish. Your saved sessions are private to your account. Queue totals cover every due revision and unfinished practice item in your account; 25 of each are shown per page.</p>
        <div className="hero-actions"><Link className="primary-action" href="/dashboard/revision">Review {revisionTotal} due revisions →</Link><Link className="sign-in-link" href="/dashboard/practice">Continue {practiceTotal} unfinished practice questions</Link></div>
      </section>
      {message ? <p className={params.calendar === "failed" || params.calendar === "invalid" ? "notice notice-error" : "notice"} role="status">{message}</p> : null}
      {hasError ? <p className="notice notice-error" role="status">Some calendar or workload data could not be loaded. The displayed totals may be incomplete.</p> : null}
      <StudyPlanTimezone timeZone={timeZone} />
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">WEEK OF {startKey}</p><h2>Your weekly workload</h2></div><div className="study-week-navigation">{weekOffset > -52 ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + (weekOffset - 1)}>← Previous</Link> : <span className="section-count">Earliest week</span>}<span className="section-count">{plannedCount} planned · {completedCount} completed · {sessionsTotal} total sessions</span>{weekOffset !== 0 ? <Link className="secondary-action" href="/dashboard/study-plan">This week</Link> : null}{weekOffset < 52 ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + (weekOffset + 1)}>Next →</Link> : <span className="section-count">Latest week</span>}</div></div>
        <div className="module-grid revision-stats">
          <article className="module-card"><span className="module-number">{totalMinutes}</span><h3>Planned minutes</h3><p>Estimated time across this week&apos;s saved sessions.</p></article>
          <article className="module-card"><span className="module-number">{completedMinutes}</span><h3>Completed minutes</h3><p>Time estimates for sessions you marked complete.</p></article>
          <article className="module-card"><span className="module-number">{revisionTotal + practiceTotal}</span><h3>Existing study tasks</h3><p>{revisionTotal} due revisions and {practiceTotal} unfinished practice questions remain outside the calendar until you schedule them.</p></article>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">ADD A BLOCK</p><h2>Schedule study time</h2></div><span className="section-count">5–480 minutes</span></div>
        <form action={createStudySession} className="document-filter-form">
          <label>Date<input type="date" name="sessionDate" required min={startKey} max={endKey} defaultValue={dateKey(formDefaultDate)} />
          <input type="hidden" name="weekOffset" value={weekOffset} /><input type="hidden" name="sessionPage" value={sessionPage} /></label>
          <label>Session title<input name="title" required maxLength={120} placeholder="e.g. Physics — electricity revision" /></label>
          <label>Estimated minutes<select name="plannedMinutes" defaultValue="45">{[15,30,45,60,90,120,180,240].map((value)=><option key={value} value={value}>{value} minutes</option>)}</select></label>
          <label>Notes (optional)<input name="notes" maxLength={500} placeholder="Chapter, goal or materials" /></label>
          <button className="primary-action" type="submit">Add to weekly calendar →</button>
        </form>
        <p className="question-card-meta">Sessions are personal plans, not automatically generated assignments. Due revision and practice tasks remain separate until you choose to schedule them.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">MONDAY–SUNDAY</p><h2>Weekly calendar</h2></div><span className="section-count">{sessionsTotal} total sessions</span></div>
        <div className="study-calendar">
          {Array.from({ length: 7 }, (_, index) => {
            const day = addCalendarDays(calendarWeekStart, index);
            const key = dateKey(day), daySessions = visibleSessions.filter((session) => session.session_date === key);
            const dayMinutes = daySessions.reduce((sum, session) => sum + session.planned_minutes, 0);
            return <section className="study-calendar-day" key={key}>
              <header><div><h3>{formatCalendarDay(day)}</h3><span>{key === dateKey(today) ? "Today" : key}</span></div><strong>{dayMinutes} min shown</strong></header>
              {!daySessions.length ? <p className="study-calendar-empty">{sessionsTotal === 0 ? "No sessions planned" : "No sessions on this page"}</p> : daySessions.map((session) =>
                <article className={"study-session-card " + (session.status === "completed" ? "is-complete" : "")} key={session.id}>
                  <div className="question-card-heading"><span className="document-status">{session.status === "completed" ? "Completed" : "Planned"}</span><span className="question-subject">{session.planned_minutes} min</span></div>
                  <h4>{session.title}</h4>{session.notes ? <p className="question-card-meta">{session.notes}</p> : null}
                  {session.status === "planned" ? <div className="study-week-navigation"><form action={completeStudySession}><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="weekOffset" value={weekOffset} /><input type="hidden" name="sessionPage" value={sessionPage} /><button className="secondary-action" type="submit">Mark complete ✓</button></form><form action={deletePlannedStudySession}><input type="hidden" name="sessionId" value={session.id} /><input type="hidden" name="weekOffset" value={weekOffset} /><input type="hidden" name="sessionPage" value={sessionPage} /><button className="secondary-action" type="submit">Remove planned session</button></form></div> : <p className="study-complete-note">Completed {session.completed_at ? new Intl.DateTimeFormat("en", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.completed_at)) : ""}</p>}
                </article>
              )}
            </section>;
          })}
        </div>
        {sessionsTotal > 50 ? <div className="study-week-navigation">
          <span className="section-count">Calendar page {sessionPage} of {sessionPages}</span>
          {sessionPage > 1 ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&sessionPage=" + (sessionPage - 1) + "&revisionPage=" + revisionPage + "&practicePage=" + practicePage}>Previous sessions</Link> : null}
          {sessionPage < sessionPages ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&sessionPage=" + (sessionPage + 1) + "&revisionPage=" + revisionPage + "&practicePage=" + practicePage}>More sessions</Link> : null}
        </div> : null}
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">UNSCHEDULED TASKS</p><h2>Study queue</h2></div><span className="section-count">{revisionTotal + practiceTotal} total tasks</span></div>
        <p className="question-card-meta">These tasks remain in their original revision and practice workflows. Add a calendar block above when you decide when to work on them. The queue is paginated: 25 due revisions and 25 unfinished practice items per page, with account-wide totals.</p>
        {dueRevisions.map((item) => <article className="question-card revision-card" key={item.question_id}>
          <div className="question-card-heading"><span className="document-status">Revision due · {item.status}</span><span className="question-subject">{item.subject ?? "Subject not set"}</span></div>
          <p className="question-card-text">{item.question_number ? item.question_number + ". " : ""}{item.question_text}</p>
          <p className="question-card-meta">{[item.chapter, item.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"} · Previous confidence {item.confidence}/5 · {item.review_count} reviews</p>
          <div className="question-card-footer"><Link className="document-open" href="/dashboard/revision">Rate confidence & schedule next review ↗</Link><Link className="document-open" href={"/dashboard/questions/" + item.question_id}>Open question ↗</Link></div>
          <form action={createStudySession} className="study-queue-schedule-form">
            <input type="hidden" name="sessionDate" value={dateKey(formDefaultDate)} />
            <input type="hidden" name="weekOffset" value={weekOffset} />
            <input type="hidden" name="sessionPage" value={sessionPage} />
            <input type="hidden" name="title" value={"Revision: " + (item.subject ?? "Question") + (item.chapter ? " — " + item.chapter : "")} />
            <input type="hidden" name="plannedMinutes" value="30" />
            <input type="hidden" name="notes" value={"Review question " + (item.question_number ?? item.question_id) + ". Rate confidence in the revision tracker after solving."} />
            <button className="secondary-action" type="submit">Schedule 30-minute revision ↗</button>
          </form>
        </article>)}
        {unfinishedItems.map((item) => <article className="question-card" key={item.id}>
          <div className="question-card-heading"><span className="document-status">Practice awaiting result · Question {item.position}</span><span className="question-subject">{item.subject ?? "Subject not set"}</span></div>
          <h3>{item.set_title}</h3>
          <p className="question-card-text">{item.question_number ? item.question_number + ". " : ""}{item.question_text}</p>
          <p className="question-card-meta">{[item.chapter, item.topic].filter(Boolean).join(" · ") || "No chapter/topic mapping"}</p>
          <div className="question-card-footer"><Link className="document-open" href={"/dashboard/practice/" + item.practice_set_id}>Continue session & record result ↗</Link></div>
          <form action={createStudySession} className="study-queue-schedule-form">
            <input type="hidden" name="sessionDate" value={dateKey(formDefaultDate)} />
            <input type="hidden" name="weekOffset" value={weekOffset} />
            <input type="hidden" name="sessionPage" value={sessionPage} />
            <input type="hidden" name="title" value={"Practice: " + (item.subject ?? "Question") + (item.chapter ? " — " + item.chapter : "")} />
            <input type="hidden" name="plannedMinutes" value="45" />
            <input type="hidden" name="notes" value={"Continue practice set: " + (item.set_title) + ". Record the result in the practice workspace."} />
            <button className="secondary-action" type="submit">Schedule 45-minute practice ↗</button>
          </form>
        </article>)}
        {!revisionTotal && !practiceTotal ? <div className="empty-state"><h3>No due or unfinished tasks</h3><p>Your current revision reviews and active practice sessions have no open tasks.</p></div> : null}
        {revisionTotal > 25 || practiceTotal > 25 ? <div className="study-week-navigation">
          <span className="section-count">Revision page {revisionPage} of {revisionPages} · Practice page {practicePage} of {practicePages}</span>
          {revisionPage > 1 ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&revisionPage=" + (revisionPage - 1) + "&practicePage=" + practicePage + "&sessionPage=" + sessionPage}>Previous revisions</Link> : null}
          {revisionPage < revisionPages ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&revisionPage=" + (revisionPage + 1) + "&practicePage=" + practicePage + "&sessionPage=" + sessionPage}>More revisions</Link> : null}
          {practicePage > 1 ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&revisionPage=" + revisionPage + "&practicePage=" + (practicePage - 1) + "&sessionPage=" + sessionPage}>Previous practice</Link> : null}
          {practicePage < practicePages ? <Link className="secondary-action" href={"/dashboard/study-plan?week=" + weekOffset + "&revisionPage=" + revisionPage + "&practicePage=" + (practicePage + 1) + "&sessionPage=" + sessionPage}>More practice</Link> : null}
        </div> : null}

      </section>
      <p className="question-card-meta">Calendar window: selected Monday–Sunday week; all sessions are counted and 50 are displayed per page. Study queue: all due revisions and unfinished practice items are counted; 25 of each are loaded per page. Time values are estimates entered by you, not measured focus time.</p>
    </main>
  );
}
