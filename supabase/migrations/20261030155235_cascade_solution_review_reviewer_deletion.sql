alter table public.question_solution_reviews
  drop constraint question_solution_reviews_reviewer_id_fkey;

alter table public.question_solution_reviews
  add constraint question_solution_reviews_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete cascade;
