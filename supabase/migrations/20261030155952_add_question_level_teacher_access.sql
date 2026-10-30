create table public.question_teacher_invites (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null check (invited_email = lower(trim(invited_email)) and length(invited_email) between 3 and 320 and invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  accepted_by uuid references auth.users(id) on delete cascade,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint question_teacher_invites_question_owner_fk foreign key (question_id, owner_id) references public.questions(id, owner_id) on delete cascade,
  constraint question_teacher_invites_acceptance_check check ((accepted_by is null and accepted_at is null) or (accepted_by is not null and accepted_at is not null)),
  constraint question_teacher_invites_not_self check (accepted_by is null or accepted_by <> owner_id),
  constraint question_teacher_invites_unique_email unique (question_id, owner_id, invited_email)
);
create index question_teacher_invites_accepted_teacher_idx on public.question_teacher_invites(accepted_by, question_id, owner_id) where accepted_by is not null and revoked_at is null;
create index question_teacher_invites_owner_question_idx on public.question_teacher_invites(owner_id, question_id, created_at desc);
alter table public.question_teacher_invites enable row level security;
create policy "question_teacher_invites_owner_select" on public.question_teacher_invites for select to authenticated using ((select auth.uid()) = owner_id);
create policy "question_teacher_invites_owner_insert" on public.question_teacher_invites for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "question_teacher_invites_owner_delete" on public.question_teacher_invites for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "question_teacher_invites_invitee_select" on public.question_teacher_invites for select to authenticated using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = invited_email and revoked_at is null);
create policy "question_teacher_invites_invitee_accept" on public.question_teacher_invites for update to authenticated using (lower(coalesce((select auth.jwt() ->> 'email'), '')) = invited_email and accepted_by is null and revoked_at is null) with check (lower(coalesce((select auth.jwt() ->> 'email'), '')) = invited_email and accepted_by = (select auth.uid()) and accepted_at is not null and revoked_at is null);
grant select, insert, delete on public.question_teacher_invites to authenticated;
revoke update on public.question_teacher_invites from authenticated;
grant update (accepted_by, accepted_at) on public.question_teacher_invites to authenticated;
revoke all on public.question_teacher_invites from anon;
create policy "questions_shared_teacher_select" on public.questions for select to authenticated using (exists (select 1 from public.question_teacher_invites invite where invite.question_id = questions.id and invite.owner_id = questions.owner_id and invite.accepted_by = (select auth.uid()) and invite.revoked_at is null));
create policy "question_solutions_shared_teacher_select" on public.question_solutions for select to authenticated using (exists (select 1 from public.question_teacher_invites invite where invite.question_id = question_solutions.question_id and invite.owner_id = question_solutions.owner_id and invite.accepted_by = (select auth.uid()) and invite.revoked_at is null));
create policy "question_solution_reviews_shared_teacher_select" on public.question_solution_reviews for select to authenticated using (reviewer_id = (select auth.uid()) and exists (select 1 from public.question_solutions solution join public.question_teacher_invites invite on invite.question_id = solution.question_id and invite.owner_id = solution.owner_id where solution.id = question_solution_reviews.solution_id and invite.owner_id = question_solution_reviews.owner_id and invite.accepted_by = (select auth.uid()) and invite.revoked_at is null));
create policy "question_solution_reviews_teacher_insert" on public.question_solution_reviews for insert to authenticated with check (reviewer_id = (select auth.uid()) and owner_id <> (select auth.uid()) and exists (select 1 from public.question_solutions solution join public.question_teacher_invites invite on invite.question_id = solution.question_id and invite.owner_id = solution.owner_id where solution.id = question_solution_reviews.solution_id and invite.owner_id = question_solution_reviews.owner_id and invite.accepted_by = (select auth.uid()) and invite.revoked_at is null));
