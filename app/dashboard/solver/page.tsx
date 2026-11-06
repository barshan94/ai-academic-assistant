import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import SolverWorkspace from "./solver-workspace";

export const dynamic = "force-dynamic";

export default async function SolverPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: solutions } = await supabase.from("question_solutions")\n    .select("id,task_type,prompt_text,output_text,review_status,created_at")\n    .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20);\n  const { data: questions } = await supabase.from("questions")
    .select("id,question_text,subject,chapter,review_status")
    .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/dashboard"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/questions">Questions</Link><Link className="sign-in-link" href="/dashboard/documents">Documents</Link><form action={signOut}><button className="signout-button" type="submit">Sign out</button></form></div>
      </header>
      <section className="hero documents-hero">
        <p className="eyebrow">AI STUDY WORKSPACE · EARLY RELEASE</p>
        <h1>Understand, solve <span>and revise.</span></h1>
        <p className="hero-copy">Generate worked solutions, classify syllabus topics, build chapter notes and create revision sets from your approved question library.</p>
      </section>
      <SolverWorkspace questions={questions ?? []} solutions={solutions ?? []} />
    </main>
  );
}
