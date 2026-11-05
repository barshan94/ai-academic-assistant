-- Add child-side indexes for foreign keys previously flagged by the
-- Supabase performance advisor. These indexes support joins and parent-row
-- deletes/updates; they are not expected to show usage in an empty database.

create index if not exists practice_set_items_practice_set_id_owner_id_idx
  on public.practice_set_items (practice_set_id, owner_id);

create index if not exists practice_set_items_question_id_owner_id_idx
  on public.practice_set_items (question_id, owner_id);

create index if not exists question_revision_progress_question_id_owner_id_idx
  on public.question_revision_progress (question_id, owner_id);

create index if not exists question_solution_mark_schemes_solution_id_owner_id_idx
  on public.question_solution_mark_schemes (solution_id, owner_id);

create index if not exists question_web_research_sources_question_id_owner_id_idx
  on public.question_web_research_sources (question_id, owner_id);
