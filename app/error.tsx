"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="shell" role="alert">
      <section className="hero documents-hero">
        <p className="eyebrow">ACADEMIC ASSISTANT</p>
        <h1>Something went <span>wrong.</span></h1>
        <p className="hero-copy">
          This page could not be loaded. Sensitive error details are hidden.
          Your last action may not have been saved, so check before submitting it again.
        </p>
        <div className="hero-actions">
          <button className="primary-action" type="button" onClick={reset}>Try again</button>
          <Link className="sign-in-link" href="/dashboard">Return to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
