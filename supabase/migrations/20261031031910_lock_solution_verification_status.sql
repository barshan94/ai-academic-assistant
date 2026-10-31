-- Verification labels are controlled by a future, separately authorized
-- verification workflow. Authenticated clients may only create generated drafts.
revoke insert on table public.question_solutions from public, anon, authenticated;
revoke insert (verification_status) on table public.question_solutions from public, anon, authenticated;
grant insert (owner_id, question_id, provider, model, prompt_version, answer_json)
  on table public.question_solutions to authenticated;

-- No client may promote or otherwise mutate a saved answer's verification label.
revoke update on table public.question_solutions from public, anon, authenticated;
revoke update (verification_status) on table public.question_solutions from public, anon, authenticated;

comment on column public.question_solutions.verification_status is
  'Server/database-controlled lifecycle label. Authenticated clients may insert only generated drafts; machine_checked and teacher_verified require a separately authorized workflow.';
