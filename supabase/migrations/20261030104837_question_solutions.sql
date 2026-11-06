alter table public.questions
  add constraint questions_id_owner_unique unique (id, owner_id);

create table public.question_solutions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null,
  provider text not null check (length(trim(provider)) between 1 and 100),
  model text not null check (length(trim(model)) between 1 and 200),
  prompt_version text not null check (length(trim(prompt_version)) between 1 and 80),
  answer_json jsonb not null check (jsonb_typeof(answer_json) = 'object'),
  verification_status text not null default 'generated'
    check (verification_status in ('generated','machine_checked','teacher_verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_solutions_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade
);

create index question_solutions_owner_question_created_idx
  on public.question_solutions(owner_id, question_id, created_at desc);

alter table public.question_solutions enable row level security;

create policy "question_solutions_owner_select"
  on public.question_solutions for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "question_solutions_owner_insert"
  on public.question_solutions for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "question_solutions_owner_update"
  on public.question_solutions for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "question_solutions_owner_delete"
  on public.question_solutions for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.question_solutions to authenticated;
revoke all on public.question_solutions from anon;
