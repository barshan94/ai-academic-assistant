import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../../actions";

export default async function SyllabusReviewQueuePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: questions, error, count } = await supabase.from("questions")
    .select("id,question_text,board,qualification,subject,syllabus_version,chapter,topic,classification_status,classification_confidence,created_at", { count: "exact" })
    .eq("owner_id", user.id)
    .in("classification_status", ["unreviewed", "uncertain"])
    .order("classification_confidence", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(100);

  const uncertainCount = (questions ?? []).filter((question) => question.classification_status === "uncertain").length;
  const unreviewedCount = (questions ?? []).filter((question) => question.classification_status === "unreviewed").length;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions">
          <Link className="sign-in-link" href="/dashboard/questions">Question bank</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus">Syllabus catalogue</Link>
          <Link className="sign-in-link" href="/dashboard">Dashboard</Link>
          <form action={signOut}><button className="signout-button" type="submit">Sign out</button></form>
        </div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">SYLLABUS INTELLIGENCE · REVIEW QUEUE</p>
        <h1>Mappings that need <span>attention.</span></h1>
        <p className="hero-copy">Questions marked uncertain or not yet reviewed are ordered by lowest confidence first. Missing confidence values appear at the top because they cannot be ranked safely.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/questions?classification=uncertain">Show uncertain in question bank</Link>
          <Link className="sign-in-link" href="/dashboard/questions?classification=unreviewed">Show unreviewed in question bank</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">OWNER REVIEW</p><h2>Pending classifications</h2></div>
          <span className="section-count">{count ?? 0} pending · {unreviewedCount} unreviewed · {uncertainCount} uncertain shown</span>
        </div>
        {error ? <p className="notice notice-error">Could not load the classification queue.</p> : null}
        {!questions?.length ? (
          <div className="empty-state"><h3>No pending mappings</h3><p>All visible question classifications are either confirmed or the question library is empty. New questions start as unreviewed.</p><Link className="primary-action" href="/dashboard/questions">Open question bank →</Link></div>
        ) : (
          <div className="question-list">
            {questions.map((question) => (
              <article className="question-card" key={question.id}>
                <div className="question-card-heading">
                  <span className="document-status">{question.classification_status}</span>
                  <span className="question-subject">{question.subject ?? "Subject not set"}</span>
                </div>
                <p className="question-card-text">{question.question_text}</p>
                <p className="question-card-meta">
                  {[question.board, question.qualification, question.syllabus_version, question.chapter, question.topic].filter(Boolean).join(" · ") || "No syllabus metadata"}
                </p>
                <div className="question-card-footer">
                  <span className="section-count">
                    Confidence: {question.classification_confidence === null ? "Not provided" : Math.round(question.classification_confidence * 100) + "%"}
                  </span>
                  <Link className="document-open" href={"/dashboard/questions/" + question.id}>Review mapping ↗</Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {(count ?? 0) > 100 ? <p className="question-card-meta">Showing the first 100 items. Resolve higher-priority entries to reach the next set.</p> : null}
      </section>
    </main>
  );
}
