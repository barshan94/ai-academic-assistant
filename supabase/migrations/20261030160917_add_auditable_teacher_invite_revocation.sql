alter table public.question_teacher_invites drop constraint question_teacher_invites_unique_email;
create unique index question_teacher_invites_active_email_unique on public.question_teacher_invites(question_id, owner_id, invited_email) where revoked_at is null;
create policy "question_teacher_invites_owner_revoke" on public.question_teacher_invites for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and revoked_at is not null);
grant update (revoked_at) on public.question_teacher_invites to authenticated;
