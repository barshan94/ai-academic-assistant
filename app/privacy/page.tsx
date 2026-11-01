import Link from "next/link";

export const metadata = {
  title: "Privacy notice | Academic Assistant",
  description: "How Academic Assistant handles academic documents, account data and optional AI features.",
};

export default function PrivacyPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Academic Assistant home">
          <span className="brand-mark">A</span>
          <span>Academic<span className="brand-muted">Assistant</span></span>
        </Link>
        <Link className="sign-in-link" href="/">Back to home</Link>
      </header>

      <section className="hero" style={{ paddingBottom: 36 }}>
        <p className="eyebrow">PRIVACY AND DATA USE</p>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)" }}>Your academic data deserves <span>careful handling.</span></h1>
        <p className="hero-copy">This notice explains the current data flows in Academic Assistant. It describes the application as implemented; it is not a promise that external providers or infrastructure are risk-free.</p>
        <p className="build-note">Last updated: 1 November 2026 · Applies to the current private workspace</p>
      </section>

      <section className="section">
        <article className="module-card" style={{ minHeight: 0 }}>
          <h3>Who can use the workspace</h3>
          <p>The workspace is designed for one owner and, when explicitly invited, question-scoped teacher accounts. It is not designed for student accounts or public sign-up. An invited teacher can access only questions and saved answer drafts covered by an accepted invitation. The owner can revoke that access.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Information the app stores</h3>
          <p>Depending on features used, the app stores account/profile identifiers, document metadata, extracted page text, questions, answer drafts and versions, syllabus classifications, teacher invitations and reviews, chapter notes, revision progress, practice history and study-calendar entries. These records are associated with the authenticated owner in Supabase. Operational logs are designed to contain only allow-listed event names, route labels, stable error codes and optional job IDs; academic content and credentials are not intended to be logged.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Google Drive document storage</h3>
          <p>When the owner connects Google Drive and uploads a document, the original PDF is stored in that owner's Drive. The app stores related metadata and extracted text in its database. The app requests the Google Drive file-only `drive.file` scope. OAuth refresh tokens are encrypted before being stored by the application. The Drive encryption key is held in server-side deployment configuration; losing that key can make existing stored connections unusable.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Optional AI processing</h3>
          <p>AI answer generation and chapter-note drafting are disabled until the owner configures a provider. When used, the relevant question or approved chapter material is sent to the configured AI provider. Source-page text is excluded by default; the owner must explicitly opt in to sending one linked page, with a bounded excerpt. Retrieval of approved chapter notes is also an explicit option. The provider may process data under its own terms, retention rules and geographic locations. Review those terms before enabling a provider. Provider usage may incur charges.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Optional web research</h3>
          <p>Web research is owner-initiated. Only the query manually entered by the owner is sent to the configured search provider; question text and uploaded documents are not automatically sent as search queries. Returned URLs and snippets are stored as private, unverified source leads, not as official or independently validated syllabus evidence.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Cookies and technical data</h3>
          <p>The app uses authentication/session cookies required to sign in securely. The study planner may store the browser&apos;s IANA time-zone identifier in a device cookie to display calendar dates and completion times consistently. The application does not use that cookie as an account identifier. Hosting, Supabase, Google and configured providers may process technical connection and security data under their own policies.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Retention, access and deletion</h3>
          <p>Academic records are retained in the private workspace until the owner removes them or the underlying account/data is otherwise removed. The current project does not publish a fixed log-retention period or provide a complete self-service account-and-data deletion workflow. Database backups, where created, are encrypted and may retain data until the archive expires or is securely removed. The current backup process does not include Supabase Auth identities, Storage objects, Google Drive files, project settings or external provider records.</p>
          <p style={{ marginTop: 12 }}>To request access, correction or deletion, contact the person who provisioned your workspace account through the same trusted channel. Do not send passwords, API keys or private documents in a support request.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Security and limitations</h3>
          <p>The app uses authenticated access, database row-level security, server-side secret handling, encrypted Drive refresh tokens and bounded processing requests. These controls reduce risk but do not guarantee that data can never be exposed or lost. The application has not been approved for production use; integrations, backup recovery, security and accessibility still require acceptance. Do not upload sensitive student information or material you are not authorized to store.</p>
        </article>
      </section>

      <footer className="footer">
        <Link href="/">Academic Assistant</Link>
        <span>Privacy notice · Current implementation</span>
      </footer>
    </main>
  );
}
