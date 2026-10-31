import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { disconnectDrive } from "./actions";
import { ResumableUploadForm } from "./ResumableUploadForm";

type DocumentsPageProps = {
  searchParams: Promise<{ drive?: string; upload?: string; process?: string }>;
};

const notices: Record<string, { text: string; tone: "success" | "error" | "info" }> = {
  connected: { text: "Google Drive is connected. You can now archive PDFs and images.", tone: "success" },
  not_configured: { text: "Google Drive credentials are not configured yet. Follow the setup guide.", tone: "error" },
  invalid_callback: { text: "Google Drive connection could not be verified. Try connecting again.", tone: "error" },
  token_exchange_failed: { text: "Google rejected the OAuth exchange. Check the Google Cloud OAuth configuration.", tone: "error" },
  missing_refresh_token: { text: "Google did not return a refresh token. Disconnect the app in Google Account permissions, then connect again.", tone: "error" },
  save_failed: { text: "The Drive connection could not be saved securely.", tone: "error" },
  disconnected: { text: "Google Drive was disconnected and the stored refresh token was revoked.", tone: "success" },
  revocation_warning: { text: "The local Drive token was removed, but Google did not confirm revocation. Remove app access in your Google Account settings too.", tone: "error" },
  disconnect_failed: { text: "Could not remove the Drive connection. Try again.", tone: "error" },
  success: { text: "Your PDF was archived in Google Drive and queued for processing.", tone: "success" },
  duplicate: { text: "This exact PDF is already in your library.", tone: "info" },
  drive_not_connected: { text: "Connect Google Drive before uploading.", tone: "error" },
  missing_file: { text: "Choose one PDF or at least one JPEG/PNG image.", tone: "error" },
  failed: { text: "Upload failed. Check file format, combined size and Google Drive permissions.", tone: "error" },
  processing_failed: { text: "Text extraction failed. Check the source PDF and try again if attempts remain.", tone: "error" },
  complete: { text: "Text extraction finished. Review every page before approving it.", tone: "success" },
  already_processed: { text: "This document has already been processed.", tone: "info" },
  already_processing: { text: "Another request is already processing this document.", tone: "info" },
  not_found: { text: "Document not found or you do not have access to it.", tone: "error" },
  job_missing: { text: "No processing job was found for this document.", tone: "error" },
  retry_limit: { text: "The automatic retry limit has been reached. Review the file manually.", tone: "error" },
  reprocess_blocked: { text: "This document already has saved questions or chapter-note sources. Reprocessing is blocked to protect those linked records; upload a new document version instead.", tone: "error" },
  reprocess_check_failed: { text: "We could not verify whether existing academic records depend on this document. Nothing was reprocessed. Refresh and try again.", tone: "error" },
  queue_failed: { text: "The processing job could not be queued. The uploaded file was rolled back.", tone: "error" },
  duplicate: { text: "This exact PDF is already in your library.", tone: "info" },
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: connection }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from("drive_connections").select("owner_id").eq("owner_id", user.id).maybeSingle(),
    supabase.from("documents").select("id,file_name,file_size_bytes,status,created_at,drive_web_view_link,page_count").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const noticeKey = params.drive ?? params.upload ?? params.process;
  const notice = noticeKey ? notices[noticeKey] : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">DOCUMENT INTELLIGENCE · MILESTONE 2</p>
        <h1>Your question <span>library.</span></h1>
        <p className="hero-copy">Archive source PDFs in your own Google Drive. JPEG/PNG batches are combined into one PDF in the order selected; original PDFs are preserved without re-encoding.</p>
      </section>

      {notice ? <p className={"notice notice-" + notice.tone} role="status">{notice.text}</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">CLOUD ARCHIVE</p><h2>Google Drive</h2></div><span className="section-count">{connection ? "Connected" : "Not connected"}</span></div>
        <div className="drive-panel">
          <div><h3>{connection ? "Your Drive is ready" : "Connect your Google account"}</h3><p>Only files created by this app are accessed through the limited Drive file scope. Refresh tokens are encrypted before being stored.</p></div>
          <div className="drive-actions"><Link className="primary-action" href="/api/drive/connect">{connection ? "Reconnect Drive" : "Connect Drive"} <span aria-hidden="true">→</span></Link>{connection ? <form action={disconnectDrive}><button className="document-action" type="submit">Disconnect Drive</button></form> : null}</div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">NEW SOURCE</p><h2>Upload a question paper</h2></div><span className="section-count">100 MB maximum</span></div>
        <form className="upload-panel" action="/api/documents/upload" method="post" encType="multipart/form-data">
          <label htmlFor="document-files">Choose one PDF or multiple JPEG/PNG images</label>
          <input id="document-files" name="files" type="file" accept="application/pdf,image/jpeg,image/png" multiple required disabled={!connection} />
          <p>Multiple images become one multi-page PDF in selection order. Upload one PDF by itself. Combined upload limit: 4 MB and 50 images.</p>
          <button className="primary-action" type="submit" disabled={!connection}>Archive and queue for processing <span aria-hidden="true">→</span></button>
        </form>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">YOUR ARCHIVE</p><h2>Recent documents</h2></div><span className="section-count">{documents?.length ?? 0} files</span></div>
        {documentsError ? <p className="notice notice-error">Could not load your documents. Refresh the page and try again.</p> : null}
        {!documents?.length ? <div className="empty-state"><h3>No documents yet</h3><p>Connect Google Drive and upload your first question paper.</p></div> : (
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.id}>
                <div className="document-icon">PDF</div>
                <div className="document-details"><h3>{document.file_name}</h3><p>{(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB · {new Date(document.created_at).toLocaleDateString("en-GB")}</p></div>
                <span className={"document-status status-" + document.status}>{document.status.replace("_", " ")}</span>
                {document.status === "queued" || document.status === "failed" || document.status === "processing" ? (
                  <form action={"/api/documents/" + document.id + "/process"} method="post"><button className="document-action" type="submit">{document.status === "processing" ? "Check / recover processing" : "Extract text"}</button></form>
                ) : <Link className="document-open" href={"/dashboard/documents/" + document.id}>Review ↗</Link>}
                {document.drive_web_view_link ? <a className="document-open" href={document.drive_web_view_link} target="_blank" rel="noreferrer">Drive ↗</a> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
