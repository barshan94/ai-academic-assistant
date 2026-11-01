-- If an invited teacher account is deleted, the FK cascade removes that
-- account's review events. Reconcile the answer label so it never claims
-- teacher_verified without a surviving independent teacher approval.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.reconcile_teacher_verification_after_review_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest_teacher_decision text;
begin
  if old.reviewer_id is not null and old.reviewer_id <> old.owner_id then
    select review.decision
      into v_latest_teacher_decision
    from public.question_solution_reviews as review
    where review.solution_id = old.solution_id
      and review.owner_id = old.owner_id
      and review.reviewer_id <> review.owner_id
    order by review.created_at desc, review.id desc
    limit 1;

    update public.question_solutions
    set verification_status = case
          when v_latest_teacher_decision = 'approved' then 'teacher_verified'
          else 'generated'
        end,
        updated_at = pg_catalog.clock_timestamp()
    where id = old.solution_id
      and owner_id = old.owner_id;
  end if;

  return old;
end;
$$;

revoke all on function private.reconcile_teacher_verification_after_review_delete()
  from public, anon, authenticated;

drop trigger if exists reconcile_teacher_verification_after_review_delete
  on public.question_solution_reviews;

create trigger reconcile_teacher_verification_after_review_delete
after delete on public.question_solution_reviews
for each row
execute function private.reconcile_teacher_verification_after_review_delete();

comment on function private.reconcile_teacher_verification_after_review_delete() is
  'Keeps teacher verification status consistent when a teacher account deletion cascades its review events.';
