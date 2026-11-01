import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { setQuestionReviewStatus } from "./actions";

type QuestionsPageProps = {
  searchParams: Promise<{ q?: string; subject?: string; created?: string; review?: string; classification?: string }>;
};

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 120);
  const subject = (params.subject ?? "").trim().slice(0, 80);
  const classificationFilter = ["unreviewed", "uncertain", "confirmed"].includes(params.classification ?? "")
    ? params.classification ?? ""
    : "";
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  let questionQuery = supabase.from("questions")
    .select("id,document_id,document_page_id,question_number,question_text,board,qualification,subject,syllabus_version,chapter,topic,classification_status,review_status,created_at")
    .eq("owner_id", user.id);

  if (search) questionQuery = questionQuery.ilike("question_text", "%" + search + "%");
  if (subject) questionQuery = questionQuery.ilike("subject", "%" + subject + "%");
  if (classificationFilter) questionQuery = questionQuery.eq("classification_status", classificationFilter);

  const { data: questions, error } = await questionQuery.order("created_at", { ascending: false }).limit(100);
  const documentIds = Array.from(new Set((questions ?? []).map((question) => question.document_id)));
  const { data: documents } = documentIds.length
    ? await supabase.from("documents").select("id,file_name").eq("owner_id", user.id).in("id", documentIds)
    : { data: [] as { id: string; file_name: string }[] };
  const documentNames = new Map((documents ?? []).map((document) => [document.id, document.file_name]));

  const notice = params.created ? "Question saved to your library."
    : params.review === "updated" ? "Question review status updated."
    : params.review === "failed" ? "Could not update question status."
    : params.review === "invalid" ? "The requested review action was invalid."
    : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/teacher-invites">Teacher invitations</Link><Link className="sign-in-link" href="/dashboard/documents">Documents</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">QUESTION BANK · M3</p>
        <h1>Your question <span>library.</span></h1>
        <p className="hero-copy">Capture questions from reviewed source pages, add syllabus metadata, and approve records before opening the solver. AI answer generation requires a server-side provider configuration.</p>
        <div className="hero-actions">
          <Link className="sign-in-link" href="/dashboard/syllabus">Manage syllabus catalogue</Link>
          <Link className="sign-in-link" href="/dashboard/syllabus/review">Review uncertain mappings</Link>
        </div>
      </section>

      {notice ? <p className="notice notice-info" role="status">{notice}</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">SEARCH YOUR LIBRARY</p><h2>Saved questions</h2></div><span className="section-count">{questions?.length ?? 0} shown · max 100</span></div>
        <form className="question-search" method="get">
          <label htmlFor="question-search-text">Question text</label>
          <input id="question-search-text" name="q" defaultValue={search} placeholder="Search your saved questions" />
          <label htmlFor="question-search-subject">Subject</label>
          <input id="question-search-subject" name="subject" defaultValue={subject} placeholder="e.g. Physics" />
          <label htmlFor="question-classification-status">Classification state</label>
          <select id="question-classification-status" name="classification" defaultValue={classificationFilter}>
            <option value="">All mappings</option>
            <option value="unreviewed">Not yet reviewed</option>
            <option value="uncertain">Uncertain</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <button className="document-action" type="submit">Search</button>
          <Link className="document-open" href="/dashboard/questions">Clear filters</Link>
        </form>

        {error ? <p className="notice notice-error">Could not load the question library.</p> : null}
        {!questions?.length ? <div className="empty-state"><h3>No questions found</h3><p>Open a document, review an extracted page, and use “Save a question from this page” to start building your library.</p><Link className="primary-action" href="/dashboard/documents">Open documents →</Link></div> : (
          <div className="question-list">
            {questions.map((question) => (
              <article className="question-card" key={question.id}>
                <div className="question-card-heading">
                  <span className="document-status">{question.review_status.replace("_", " ")}</span>
                  <span className="question-subject">{question.subject ?? "Subject not set"}</span>
                </div>
                <p className="question-card-text">{question.question_number ? question.question_number + ". " : ""}{question.question_text}</p>
                <p className="question-card-meta">{[question.board, question.qualification, question.syllabus_version, question.chapter, question.topic].filter(Boolean).join(" · ") || "Syllabus metadata not set"} · Mapping: {question.classification_status.replace("_", " ")}</p>
                <div className="question-card-footer">
                  <Link className="document-open" href={"/dashboard/questions/" + question.id}>Open solver ↗</Link><Link className="document-open" href={"/dashboard/documents/" + question.document_id}>Source: {documentNames.get(question.document_id) ?? "Open document"} ↗</Link>
                  {question.review_status === "needs_review" ? (
                    <div className="question-review-actions">
                      <form action={setQuestionReviewStatus}><input type="hidden" name="questionId" value={question.id} /><input type="hidden" name="status" value="approved" /><button className="document-action" type="submit">Approve</button></form>
                      <form action={setQuestionReviewStatus}><input type="hidden" name="questionId" value={question.id} /><input type="hidden" name="status" value="rejected" /><button className="document-action document-action-muted" type="submit">Reject</button></form>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
