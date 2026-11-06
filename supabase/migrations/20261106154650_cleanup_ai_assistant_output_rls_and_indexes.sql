drop policy if exists "Owners manage their AI solutions" on public.question_solutions;
drop index if exists public.question_solutions_owner_created_idx;
create index if not exists ai_assistant_outputs_question_owner_idx
  on public.ai_assistant_outputs(question_id, owner_id);
