import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptQuestionTeacherInvite } from "@/app/dashboard/questions/[id]/actions";
import type { DatabaseWithAISolutions } from "@/types/ai-database";
import type { SupabaseClient } from "@supabase/supabase-js";

type PageProps = { searchParams: Promise<{ invite?: string }> };

export default async function TeacherInvitesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email) redirect("/login");
  const typedSupabase = supabase as unknown as SupabaseClient<DatabaseWithAISolutions>;
  const [incomingResult, outgoingResult] = await Promise.all([
    typedSupabase.from("question_teacher_invites")
      .select("id,question_id,owner_id,invited_email,accepted_by,accepted_at,revoked_at,expires_at,created_at")
      .eq("invited_email", user.email.toLowerCase())
      .order("created_at", { ascending: false }).limit(50),
    typedSupabase.from("question_teacher_invites")
      .select("id,question_id,owner_id,invited_email,accepted_by,accepted_at,revoked_at,expires_at,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }).limit(50),
  ]);
  const incoming = incomingResult.data ?? [];
  const outgoing = outgoingResult.data ?? [];
  const inviteError = incomingResult.error || outgoingResult.error;
  const message = query.invite === "accepted" ? "Invitation accepted. You can now open the shared question."
    : query.invite === "not_available" ? "This invitation is unavailable, revoked, already accepted, or belongs to another email account."
    : query.invite === "invalid" ? "The invitation details were invalid." : undefined;
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Academic<span className="brand-muted">Assistant</span></span></Link>
        <div className="topbar-actions"><Link className="sign-in-link" href="/dashboard/questions">Question bank</Link><Link className="sign-in-link" href="/dashboard">Dashboard</Link></div>
      </header>
      <section className="hero documents-hero"><p className="eyebrow">COLLABORATION</p><h1>Teacher <span>invitations.</span></h1><p className="hero-copy">Accept an invitation to review a specific question and its saved AI answer drafts. Access is limited to the question shared with you.</p></section>
      {message ? <p className="notice notice-info" role="status">{message}</p> : null}
      {inviteError ? <p className="notice notice-error">Could not load invitations.</p> : null}
      <section className="section"><h2>Invitations for you</h2>
        {incoming.length ? incoming.map((invite) => <article className="question-card" key={invite.id}>
          <p className="question-card-meta">Question ID: {invite.question_id}</p><p className="question-card-meta">Invited {new Date(invite.created_at).toLocaleString()}</p>
          <p className="question-card-meta">Acceptance deadline: {new Date(invite.expires_at).toLocaleString()}</p>
          {invite.revoked_at ? <p className="notice notice-info">This invitation has been revoked.</p>
            : invite.accepted_by ? <p className="notice notice-info">Accepted. <Link href={"/dashboard/questions/" + invite.question_id}>Open shared question →</Link></p>
            : new Date(invite.expires_at).getTime() <= Date.now() ? <p className="notice notice-info">This invitation has expired. Ask the owner to send a new invitation.</p>
            : <form action={acceptQuestionTeacherInvite}><input type="hidden" name="inviteId" value={invite.id} /><button className="primary-action" type="submit">Accept invitation →</button></form>}
        </article>) : <p className="question-card-meta">No invitations have been sent to this account email.</p>}
      </section>
      <section className="section"><h2>Invitations you sent</h2>
        {outgoing.length ? outgoing.map((invite) => <article className="question-card" key={invite.id}>
          <p>{invite.invited_email}</p><p className="question-card-meta">Question ID: {invite.question_id}</p>
          <p className="question-card-meta">{invite.revoked_at ? "Revoked" : invite.accepted_by ? "Accepted" : new Date(invite.expires_at).getTime() <= Date.now() ? "Expired — re-invitation allowed" : "Waiting for acceptance"}</p>
          <p className="question-card-meta">Expires {new Date(invite.expires_at).toLocaleString()}</p>
        </article>) : <p className="question-card-meta">You have not invited a teacher yet.</p>}
      </section>
    </main>
  );
}
