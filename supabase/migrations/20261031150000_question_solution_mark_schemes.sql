create table public.question_solution_mark_schemes (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  awarding_body text not null check (length(trim(awarding_body)) between 1 and 100),
  qualification text not null check (length(trim(qualification)) between 1 and 100),
  subject text not null check (length(trim(subject)) between 1 and 100),
  paper_reference text check (paper_reference is null or length(trim(paper_reference)) <= 100),
  source_url text not null check (source_url ~* '^https://'),
  points jsonb not null check (
    jsonb_typeof(points) = 'array'
    and jsonb_array_length(points) between 1 and 80
  ),
  created_at timestamptz not null default now(),
  constraint question_solution_mark_schemes_solution_owner_fk
    foreign key (solution_id, owner_id)
    references public.question_solutions(id, owner_id) on delete cascade
);

create index question_solution_mark_schemes_owner_solution_created_idx
  on public.question_solution_mark_schemes(owner_id, solution_id, created_at desc);

alter table public.question_solution_mark_schemes enable row level security;

create policy "question_solution_mark_schemes_owner_select"
  on public.question_solution_mark_schemes for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "question_solution_mark_schemes_owner_insert"
  on public.question_solution_mark_schemes for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.question_solutions s
      where s.id = solution_id and s.owner_id = (select auth.uid())
    )
  );

revoke all on public.question_solution_mark_schemes from public, anon;
grant select, insert on public.question_solution_mark_schemes to authenticated;
