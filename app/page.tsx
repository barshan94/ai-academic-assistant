import Link from "next/link";

const workspaceItems = [
  { number: "01", title: "Question library", description: "Organise questions by board, qualification, subject and chapter.", status: "Planned" },
  { number: "02", title: "Upload documents", description: "Prepare question images and PDFs for structured extraction.", status: "Planned" },
  { number: "03", title: "Solutions & explanations", description: "Create exam-ready answers with Bengali and English teaching notes.", status: "Planned" },
  { number: "04", title: "Chapter intelligence", description: "Build reusable notes, formula sheets and revision material.", status: "Planned" },
];

const subjects = ["Physics", "Mathematics", "Further Pure Mathematics", "ICT", "Computer Science"];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Academic Assistant home">
          <span className="brand-mark">A</span>
          <span>Academic<span className="brand-muted">Assistant</span></span>
        </Link>
        <div className="topbar-actions">
          <span className="workspace-label"><span className="status-dot" /> Personal workspace</span>
          <Link className="sign-in-link" href="/login">Sign in <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR ACADEMIC WORKSPACE</p>
        <h1>Turn questions into <span>lasting knowledge.</span></h1>
        <p className="hero-copy">A focused workspace for teaching, solving and organising O Level, A Level, SSC and HSC academic material.</p>
        <div className="hero-actions">
          <a className="primary-action" href="#workspace">Explore workspace <span aria-hidden="true">↗</span></a>
          <span className="build-note">Foundation build · Private sign-in now available</span>
        </div>
      </section>

      <section className="section" id="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">WORKSPACE</p><h2>What you can build here</h2></div>
          <span className="section-count">04 modules</span>
        </div>
        <div className="module-grid">
          {workspaceItems.map((item) => (
            <article className="module-card" key={item.number}>
              <div className="module-top"><span className="module-number">{item.number}</span><span className="planned">{item.status}</span></div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="module-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section subject-section">
        <div className="section-heading">
          <div><p className="eyebrow">SUBJECT COVERAGE</p><h2>Built around your teaching</h2></div>
        </div>
        <div className="subject-list">
          {subjects.map((subject) => <span className="subject-chip" key={subject}>{subject}</span>)}
        </div>
      </section>

      <footer className="footer">
        <span>Academic Assistant <span className="footer-muted">· Built for careful learning</span></span>
        <span><Link href="/privacy">Privacy notice</Link> · Milestone 1 · Foundation</span>
      </footer>
    </main>
  );
}
