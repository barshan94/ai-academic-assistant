import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | Academic Assistant",
  robots: { index: false, follow: false, noarchive: true },
};
import { signIn } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  configuration: "Authentication is not configured yet. Add the Supabase project URL and publishable key.",
  missing_fields: "Enter both your email address and password.",
  sign_in_failed: "We could not sign you in. Check your credentials and try again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const message = error ? errorMessages[error] : undefined;

  return (
    <main className="auth-shell">
      <Link className="auth-back" href="/">← Academic Assistant</Link>
      <section className="auth-card">
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1 className="auth-title">Welcome back.</h1>
        <p className="auth-copy">Sign in to access your academic workspace.</p>

        {message ? <p className="auth-error" role="alert">{message}</p> : null}

        <form action={signIn} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button className="primary-action auth-submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-footnote">Access is limited to the account owner. New accounts are created privately in the Supabase dashboard. Read the <Link href="/privacy">privacy notice</Link> before signing in.</p>
      </section>
    </main>
  );
}
