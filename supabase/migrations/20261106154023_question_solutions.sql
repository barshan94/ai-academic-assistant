-- Persist AI outputs as unverified teacher-reviewable records.
create table if not exists public.question_solutions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid null,
  task_type text not null check (task_type in ('solve','classify','chapter_notes','revision_set')),
  prompt_text text not null,
  output_text text not null,
  provider_model text not null,
  review_status text not null default 'needs_review' check (review_status in ('needs_review','approved','rejected')),
  created_at timestamptz not null default now(),
  constraint question_solutions_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade
);

create index if not exists question_solutions_owner_created_idx
  on public.question_solutions(owner_id, created_at desc);

alter table public.question_solutions enable row level security;
revoke all on public.question_solutions from anon;
grant select, insert, update, delete on public.question_solutions to authenticated;

drop policy if exists "Owners manage their AI solutions" on public.question_solutions;
create policy "Owners manage their AI solutions"
  on public.question_solutions
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
