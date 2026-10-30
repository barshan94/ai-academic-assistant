create index question_solutions_question_owner_fk_idx
  on public.question_solutions(question_id, owner_id);
