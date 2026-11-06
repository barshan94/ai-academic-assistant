import Link from "next/link";

export const metadata = {
  title: "Support | Academic Assistant",
  description: "How to request help with access, academic records and account privacy in Academic Assistant.",
};

export default function SupportPage() {
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
        <p className="eyebrow">HELP AND ACCOUNT SUPPORT</p>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)" }}>A safe way to <span>ask for help.</span></h1>
        <p className="hero-copy">This is a private, provisioned workspace. Support requests should go through a channel you already trust, not through an unverified public inbox.</p>
      </section>

      <section className="section">
        <article className="module-card" style={{ minHeight: 0 }}>
          <h3>If you are an invited teacher</h3>
          <p>Contact the workspace owner or the person who invited you using the same trusted channel used for your invitation. They can review access, resend an invitation or revoke access when needed.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>If you are the workspace owner</h3>
          <p>Use your existing trusted account or project-administration channel for infrastructure and account issues. Before launch, publish a monitored support address and name a primary and backup operator. This page does not currently provide a staffed support inbox or emergency response service.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Protect your information</h3>
          <p>Never send passwords, one-time codes, API keys, OAuth tokens, private documents or student personal information in a support request. Describe the problem using the page name, approximate time and a non-sensitive error message instead.</p>
        </article>
        <article className="module-card" style={{ minHeight: 0, marginTop: 12 }}>
          <h3>Privacy and data requests</h3>
          <p>For access, correction or deletion requests, contact the person who provisioned your workspace account through the original trusted channel. Read the <Link href="/privacy">privacy notice</Link> before sharing any information.</p>
        </article>
      </section>

      <footer className="footer">
        <Link href="/">Academic Assistant</Link>
        <span><Link href="/privacy">Privacy notice</Link> · Support guidance</span>
      </footer>
    </main>
  );
}
