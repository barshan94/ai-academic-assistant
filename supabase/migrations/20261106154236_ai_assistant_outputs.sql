create table if not exists public.ai_assistant_outputs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid null,
  task_type text not null check (task_type in ('solve','classify','chapter_notes','revision_set')),
  prompt_text text not null,
  output_text text not null,
  provider_model text not null,
  review_status text not null default 'needs_review' check (review_status in ('needs_review','approved','rejected')),
  created_at timestamptz not null default now(),
  constraint ai_assistant_outputs_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete set null (question_id)
);
create index if not exists ai_assistant_outputs_owner_created_idx
  on public.ai_assistant_outputs(owner_id, created_at desc);
alter table public.ai_assistant_outputs enable row level security;
revoke all on public.ai_assistant_outputs from anon;
grant select, insert, update, delete on public.ai_assistant_outputs to authenticated;
create policy "Owners manage AI assistant outputs"
  on public.ai_assistant_outputs for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));