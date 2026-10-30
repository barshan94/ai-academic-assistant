import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DocumentsPageProps = {
  searchParams: Promise<{ drive?: string; upload?: string }>;
};

const notices: Record<string, { text: string; tone: "success" | "error" | "info" }> = {
  connected: { text: "Google Drive is connected. You can now archive PDFs and images.", tone: "success" },
  not_configured: { text: "Google Drive credentials are not configured yet. Follow the setup guide.", tone: "error" },
  invalid_callback: { text: "Google Drive connection could not be verified. Try connecting again.", tone: "error" },
  token_exchange_failed: { text: "Google rejected the OAuth exchange. Check the Google Cloud OAuth configuration.", tone: "error" },
  missing_refresh_token: { text: "Google did not return a refresh token. Disconnect the app in Google Account permissions, then connect again.", tone: "error" },
  save_failed: { text: "The Drive connection could not be saved securely.", tone: "error" },
  success: { text: "Your file was archived in Google Drive and queued for processing.", tone: "success" },
  duplicate: { text: "This exact PDF is already in your library.", tone: "info" },
  drive_not_connected: { text: "Connect Google Drive before uploading.", tone: "error" },
  missing_file: { text: "Choose a PDF, JPEG or PNG file first.", tone: "error" },
  failed: { text: "Upload failed. Check file format, size and Google Drive permissions.", tone: "error" },
  queue_failed: { text: "The processing job could not be queued. The uploaded file was rolled back.", tone: "error" },
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

  const noticeKey = params.drive ?? params.upload;
  const notice = noticeKey ? notices[noticeKey] : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard">Dashboard</Link><form action="/dashboard/signout" method="post"><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>

      <section className="hero documents-hero">
        <p className="eyebrow">DOCUMENT INTELLIGENCE · MILESTONE 2</p>
        <h1>Your question <span>library.</span></h1>
        <p className="hero-copy">Archive source PDFs in your own Google Drive. Images are converted into PDFs before archiving; original PDFs are preserved without re-encoding.</p>
      </section>

      {notice ? <p className={`notice notice-${notice.tone}`} role="status">{notice.text}</p> : null}

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">CLOUD ARCHIVE</p><h2>Google Drive</h2></div><span className="section-count">{connection ? "Connected" : "Not connected"}</span></div>
        <div className="drive-panel">
          <div><h3>{connection ? "Your Drive is ready" : "Connect your Google account"}</h3><p>Only files created by this app are accessed through the limited Drive file scope. Refresh tokens are encrypted before being stored.</p></div>
          <Link className="primary-action" href="/api/drive/connect">{connection ? "Reconnect Drive" : "Connect Drive"} <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><p className="eyebrow">NEW SOURCE</p><h2>Upload a question paper</h2></div><span className="section-count">20 MB max</span></div>
        <form className="upload-panel" action="/api/documents/upload" method="post" encType="multipart/form-data">
          <label htmlFor="document-file">Choose PDF, JPEG or PNG</label>
          <input id="document-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required disabled={!connection} />
          <p>Images become single-page PDFs. Existing PDFs remain unchanged. Maximum upload size: 20 MB.</p>
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
                <span className={`document-status status-${document.status}`}>{document.status.replace("_", " ")}</span>
                {document.drive_web_view_link ? <a className="document-open" href={document.drive_web_view_link} target="_blank" rel="noreferrer">Open ↗</a> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
