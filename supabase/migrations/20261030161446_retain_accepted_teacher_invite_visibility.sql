drop policy "question_teacher_invites_select" on public.question_teacher_invites;
create policy "question_teacher_invites_select" on public.question_teacher_invites for select to authenticated
using (
  owner_id = (select auth.uid())
  or (
    revoked_at is null
    and (
      lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email
      or accepted_by = (select auth.uid())
    )
  )
);
