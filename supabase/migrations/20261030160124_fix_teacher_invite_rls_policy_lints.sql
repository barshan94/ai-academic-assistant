drop policy if exists "questions_shared_teacher_select" on public.questions;
drop policy "question_teacher_invites_select" on public.question_teacher_invites;
create policy "question_teacher_invites_select" on public.question_teacher_invites for select to authenticated using ((select auth.uid()) = owner_id or (lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email and revoked_at is null));
drop policy "question_teacher_invites_invitee_accept" on public.question_teacher_invites;
create policy "question_teacher_invites_invitee_accept" on public.question_teacher_invites for update to authenticated using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email and accepted_by is null and revoked_at is null) with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email and accepted_by = (select auth.uid()) and accepted_at is not null and revoked_at is null);
