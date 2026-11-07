import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { saveQuestionImportance, removeQuestionImportance } from "./actions";

type ImportancePageProps = { searchParams: Promise<{ status?: string; level?: string; subject?: string }> };

export default async function ImportantQuestionsPage({ searchParams }: ImportancePageProps) {
  const params = await searchParams;
  const level = ["core", "high", "medium"].includes(params.level ?? "") ? params.level ?? "" : "";
  const subject = (params.subject ?? "").trim().slice(0, 80);
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let questionQuery = supabase.from("questions")
    .select("id,document_id,question_number,question_text,subject,chapter,topic,board,qualification,review_status")
    .eq("owner_id", user.id)
    .eq("review_status", "approved");
  if (subject) questionQuery = questionQuery.ilike("subject", "%" + subject + "%");
  const { data: questions, error } = await questionQuery.order("created_at", { ascending: false }).limit(100);
  const ids = (questions ?? []).map((q) => q.id);
  const { data: marks } = ids.length
    ? await supabase.from("question_importance").select("question_id,importance_level,rationale").eq("owner_id", user.id).in("question_id", ids)
    : { data: [] as { question_id: string; importance_level: string; rationale: string }[] };
  const marked = new Map((marks ?? []).map((mark) => [mark.question_id, mark]));
  const { data: docs } = (questions ?? []).length
    ? await supabase.from("documents").select("id,file_name").eq("owner_id", user.id).in("id", Array.from(new Set((questions ?? []).map((q) => q.document_id))))
    : { data: [] as { id: string; file_name: string }[] };
  const docNames = new Map((docs ?? []).map((doc) => [doc.id, doc.file_name]));
  const notice = params.status === "saved" ? "Importance saved."
    : params.status === "removed" ? "Removed from important questions."
    : params.status === "failed" ? "Could not update this question. Check that it is approved and belongs to your library."
    : params.status === "invalid" ? "The importance details were invalid." : "";

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
      <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/questions">Questions</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
    </header>
    <section className="hero documents-hero">
      <p className="eyebrow">TEACHER-CURATED REVISION</p>
      <h1>Important <span>questions.</span></h1>
      <p className="hero-copy">Mark approved questions as core, high or medium priority and record why they matter. These are teacher-selected priorities—not AI exam predictions or guaranteed questions.</p>
      <div className="hero-actions"><Link className="sign-in-link" href="/dashboard/questions">Back to question bank</Link><span className="section-count">{marks?.length ?? 0} marked · {questions?.length ?? 0} approved questions</span></div>
    </section>
    {notice ? <p className={params.status === "failed" || params.status === "invalid" ? "notice notice-error" : "notice notice-info"} role="status">{notice}</p> : null}
    <section className="section">
      <form className="question-search" method="get">
        <label htmlFor="important-subject">Subject</label><input id="important-subject" name="subject" defaultValue={subject} placeholder="Filter by subject" />
        <label htmlFor="important-level">Priority</label><select id="important-level" name="level" defaultValue={level}><option value="">All priorities</option><option value="core">Core</option><option value="high">High</option><option value="medium">Medium</option></select>
        <button className="document-action" type="submit">Filter</button><Link className="document-open" href="/dashboard/important-questions">Clear</Link>
      </form>
      {error ? <p className="notice notice-error">Could not load approved questions.</p> : null}
      {!questions?.length ? <div className="empty-state"><h3>No approved questions found</h3><p>Approve questions in your question library first. Only approved questions can be added to this curated list.</p><Link className="primary-action" href="/dashboard/questions">Open question bank →</Link></div> :
        <div className="question-list">{questions.filter((q) => !level || marked.get(q.id)?.importance_level === level).map((q) => {
          const mark = marked.get(q.id);
          return <article className="question-card" key={q.id}>
            <div className="question-card-heading"><span className="document-status">{mark ? (mark.importance_level === "core" ? "Core priority" : mark.importance_level + " priority") : "Not marked"}</span><span className="question-subject">{q.subject ?? "Subject not set"}</span></div>
            <p className="question-card-text">{q.question_number ? q.question_number + ". " : ""}{q.question_text}</p>
            <p className="question-card-meta">{[q.board, q.qualification, q.chapter, q.topic].filter(Boolean).join(" · ") || "Syllabus details not set"}</p>
            <form className="question-search" action={saveQuestionImportance}>
              <input type="hidden" name="questionId" value={q.id} />
              <label htmlFor={"priority-"+q.id}>Priority</label><select id={"priority-"+q.id} name="importanceLevel" defaultValue={mark?.importance_level ?? "high"}><option value="core">Core — must teach/revise</option><option value="high">High — important</option><option value="medium">Medium — useful practice</option></select>
              <label htmlFor={"reason-"+q.id}>Reason (optional)</label><input id={"reason-"+q.id} name="rationale" maxLength={500} defaultValue={mark?.rationale ?? ""} placeholder="e.g. essential concept or teacher emphasis" />
              <button className="document-action" type="submit">{mark ? "Update priority" : "Mark important"}</button>
            </form>
            <div className="question-card-footer"><Link className="document-open" href={"/dashboard/questions/"+q.id}>Open solution ↗</Link><Link className="document-open" href={"/dashboard/documents/"+q.document_id}>Source: {docNames.get(q.document_id) ?? "Open document"} ↗</Link>
              {mark ? <form action={removeQuestionImportance}><input type="hidden" name="questionId" value={q.id}/><button className="document-action document-action-muted" type="submit">Remove priority</button></form> : null}
            </div>
          </article>;
        })}</div>}
    </section>
  </main>;
}
