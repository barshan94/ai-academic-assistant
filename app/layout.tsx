import type { Metadata } from "next";
import "./globals.css";

// A per-request CSP nonce requires dynamic HTML rendering; never serve a
// pre-rendered page whose inline Next.js scripts cannot carry that nonce.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academic Assistant",
  description: "Your personal academic intelligence workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
