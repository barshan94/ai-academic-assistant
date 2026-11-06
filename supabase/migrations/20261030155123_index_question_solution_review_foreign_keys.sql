create index question_solution_reviews_reviewer_id_idx
  on public.question_solution_reviews(reviewer_id);

create index question_solution_reviews_solution_owner_fk_idx
  on public.question_solution_reviews(solution_id, owner_id);
