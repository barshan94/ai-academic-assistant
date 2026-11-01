-- Complete the teacher-review write boundary. Owners may append owner
-- feedback, but only the invitation-checked RPC may append teacher reviews or
-- change a solution's teacher-verification state.

revoke insert on public.question_teacher_invites from authenticated;

drop policy if exists "question_solution_reviews_teacher_insert"
  on public.question_solution_reviews;
drop policy if exists "question_solution_reviews_owner_or_teacher_insert"
  on public.question_solution_reviews;
drop policy if exists "question_solution_reviews_owner_insert"
  on public.question_solution_reviews;

create policy "question_solution_reviews_owner_insert"
  on public.question_solution_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and owner_id = (select auth.uid())
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.record_teacher_solution_review(
  p_solution_id uuid,
  p_decision text,
  p_correction_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid := (select auth.uid());
  v_owner_id uuid;
  v_question_id uuid;
  v_review_id uuid;
begin
  if v_reviewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_decision is null or p_decision not in ('approved', 'needs_correction') then
    raise exception using errcode = '22023', message = 'Invalid teacher review decision';
  end if;

  if p_correction_notes is not null and length(trim(p_correction_notes)) > 5000 then
    raise exception using errcode = '22023', message = 'Review notes must not exceed 5000 characters';
  end if;

  if p_decision = 'needs_correction'
    and (p_correction_notes is null or length(trim(p_correction_notes)) = 0) then
    raise exception using errcode = '22023', message = 'Correction notes are required';
  end if;

  select solution.owner_id, solution.question_id
    into v_owner_id, v_question_id
  from public.question_solutions as solution
  where solution.id = p_solution_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Solution not found';
  end if;

  if v_owner_id = v_reviewer_id then
    raise exception using errcode = '42501', message = 'Owner cannot submit an independent teacher review';
  end if;

  -- Locking the invite serializes review against owner revocation. If the
  -- revocation commits first, this check fails; otherwise the review commits
  -- before revocation can take effect.
  perform 1
  from public.question_teacher_invites as invite
  where invite.question_id = v_question_id
    and invite.owner_id = v_owner_id
    and invite.accepted_by = v_reviewer_id
    and invite.revoked_at is null
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'An active accepted teacher invitation is required';
  end if;

  insert into public.question_solution_reviews (
    solution_id, owner_id, reviewer_id, decision, correction_notes
  ) values (
    p_solution_id, v_owner_id, v_reviewer_id, p_decision,
    nullif(trim(p_correction_notes), '')
  )
  returning id into v_review_id;

  if p_decision = 'approved' then
    update public.question_solutions
    set verification_status = 'teacher_verified',
        updated_at = now()
    where id = p_solution_id
      and owner_id = v_owner_id;
  else
    update public.question_solutions
    set verification_status = 'generated',
        updated_at = now()
    where id = p_solution_id
      and owner_id = v_owner_id
      and verification_status = 'teacher_verified';
  end if;

  return v_review_id;
end;
$$;

create or replace function public.record_teacher_solution_review(
  p_solution_id uuid,
  p_decision text,
  p_correction_notes text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.record_teacher_solution_review(
    p_solution_id,
    p_decision,
    p_correction_notes
  );
$$;

revoke all on function private.record_teacher_solution_review(uuid, text, text)
  from public, anon;
grant execute on function private.record_teacher_solution_review(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.record_teacher_solution_review(uuid, text, text)
  from public, anon;
grant execute on function public.record_teacher_solution_review(uuid, text, text)
  to authenticated;

comment on function public.record_teacher_solution_review(uuid, text, text) is
  'SECURITY INVOKER wrapper. The private implementation checks an active accepted invitation, appends an immutable review, and alone may update teacher verification state.';
