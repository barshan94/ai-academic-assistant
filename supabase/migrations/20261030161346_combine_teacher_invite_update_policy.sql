drop policy "question_teacher_invites_invitee_accept" on public.question_teacher_invites;
drop policy "question_teacher_invites_owner_revoke" on public.question_teacher_invites;
create policy "question_teacher_invites_update_accept_or_revoke" on public.question_teacher_invites for update to authenticated
using (
  (lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email and accepted_by is null and revoked_at is null)
  or owner_id = (select auth.uid())
)
with check (
  (lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email and accepted_by = (select auth.uid()) and accepted_at is not null and revoked_at is null)
  or (owner_id = (select auth.uid()) and revoked_at is not null)
);
