import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approveDocument, savePageCorrection } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ process?: string; review?: string }>;
};

const notices: Record<string, string> = {
  complete: "Extraction completed. Machine-extracted text is not yet verified.",
  already_reviewed: "This document has already been approved.",
  failed: "Extraction failed. Check the original file and retry from the document library.",
  saved: "Your correction was saved. The page remains pending review.",
  save_failed: "The correction could not be saved.",
  invalid: "Enter non-empty text under 50,000 characters.",
  approved: "You marked this document as reviewed. This is a teacher review status, not an automated accuracy guarantee.",
  approve_failed: "The review status could not be updated completely. Refresh and inspect the document.",
  empty: "There are no extracted pages to approve.",
};

export default async function DocumentReviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: document, error: documentError }, { data: pages, error: pagesError }] = await Promise.all([
    supabase.from("documents").select("id,file_name,status,page_count,drive_web_view_link,created_at").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase.from("document_pages").select("id,page_number,extracted_text,extraction_method,status").eq("document_id", id).eq("owner_id", user.id).order("page_number"),
  ]);

  if (documentError || !document) notFound();
  const noticeKey = query.review ?? query.process;
  const notice = noticeKey ? notices[noticeKey] : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/documents">Library</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link></div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">DOCUMENT REVIEW · {document.status.toUpperCase().replace("_", " ")}</p>
        <h1>{document.file_name}</h1>
        <p className="hero-copy">Check the extracted text against the source document. Correct mistakes before marking this document reviewed.</p>
        {document.drive_web_view_link ? <a className="document-open" href={document.drive_web_view_link} target="_blank" rel="noreferrer">Open original in Google Drive ↗</a> : null}
      </section>

      {notice ? <p className="notice notice-info" role="status">{notice}</p> : null}
      {pagesError ? <p className="notice notice-error">Could not load extracted pages.</p> : null}

      {!pages?.length ? (
        <section className="section"><div className="empty-state"><h3>No extracted text yet</h3><p>Return to the document library and run text extraction. Scanned or protected PDFs may require manual handling.</p><Link className="primary-action" href="/dashboard/documents">Back to library →</Link></div></section>
      ) : (
        <section className="section">
          <div className="section-heading"><div><p className="eyebrow">EXTRACTED CONTENT</p><h2>{pages.length} review pages</h2></div><span className="section-count">Human review required</span></div>
          <div className="review-list">
            {pages.map((page) => (
              <article className="review-page" key={page.id}>
                <div className="review-page-heading"><h3>Page {page.page_number}</h3><span className="document-status">{page.status.replace("_", " ")} · {page.extraction_method ?? "unknown"}</span></div>
                <form action={savePageCorrection} className="review-form">
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="documentId" value={document.id} />
                  <label htmlFor={"page-text-" + page.id}>Extracted text (edit to correct OCR mistakes)</label>
                  <textarea id={"page-text-" + page.id} name="extractedText" defaultValue={page.extracted_text ?? ""} rows={10} maxLength={50000} required />
                  <button className="document-action" type="submit">Save correction</button>
                </form>
              </article>
            ))}
          </div>
          {document.status !== "ready" ? (
            <form action={approveDocument} className="approve-panel">
              <input type="hidden" name="documentId" value={document.id} />
              <div><h3>Finished checking every page?</h3><p>Approving marks the extracted pages as teacher-reviewed. It does not mean the AI has solved or independently verified the questions.</p></div>
              <button className="primary-action" type="submit">Mark reviewed <span aria-hidden="true">✓</span></button>
            </form>
          ) : <p className="notice notice-success">Teacher review completed.</p>}
        </section>
      )}
    </main>
  );
}
