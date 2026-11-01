-- Review chronology must reflect the actual insert point, not transaction
-- start time. This keeps reconciliation correct when concurrent reviews wait
-- on the same solution row before appending their review events.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.stamp_question_solution_review_created_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke all on function private.stamp_question_solution_review_created_at()
  from public, anon, authenticated;

drop trigger if exists stamp_question_solution_review_created_at
  on public.question_solution_reviews;

create trigger stamp_question_solution_review_created_at
before insert on public.question_solution_reviews
for each row
execute function private.stamp_question_solution_review_created_at();

comment on function private.stamp_question_solution_review_created_at() is
  'Uses the database wall clock for append-only review chronology, including after lock waits.';
