alter table public.question_solutions
  add constraint question_solutions_id_owner_unique unique (id, owner_id);

create table public.question_solution_reviews (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'needs_correction')),
  correction_notes text,
  created_at timestamptz not null default now(),
  constraint question_solution_reviews_notes_check
    check (
      (decision = 'approved' and (correction_notes is null or length(trim(correction_notes)) <= 5000))
      or
      (decision = 'needs_correction' and correction_notes is not null
        and length(trim(correction_notes)) between 1 and 5000)
    ),
  constraint question_solution_reviews_solution_owner_fk
    foreign key (solution_id, owner_id)
    references public.question_solutions(id, owner_id) on delete cascade
);

create index question_solution_reviews_owner_solution_created_idx
  on public.question_solution_reviews(owner_id, solution_id, created_at desc);

alter table public.question_solution_reviews enable row level security;

create policy "question_solution_reviews_owner_select"
  on public.question_solution_reviews for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "question_solution_reviews_owner_insert"
  on public.question_solution_reviews for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select auth.uid()) = reviewer_id
  );

grant select, insert on public.question_solution_reviews to authenticated;
revoke update, delete on public.question_solution_reviews from authenticated;
revoke all on public.question_solution_reviews from anon;

-- Keep original AI answer versions immutable; reviews are separate audit records.
revoke update on public.question_solutions from authenticated;
