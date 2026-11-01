-- Revocation is a one-way, database-timestamped transition. Do not let
-- clients choose the audit timestamp or mutate invite state directly.

drop policy if exists "question_teacher_invites_owner_revoke"
  on public.question_teacher_invites;

revoke update on public.question_teacher_invites from authenticated;
revoke update (accepted_by, accepted_at, revoked_at)
  on public.question_teacher_invites from authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.revoke_question_teacher_invite(
  p_invite_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_invite_owner_id uuid;
  v_question_id uuid;
  v_revoked_at timestamptz;
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select invite.owner_id, invite.question_id, invite.revoked_at
    into v_invite_owner_id, v_question_id, v_revoked_at
  from public.question_teacher_invites as invite
  where invite.id = p_invite_id
  for update;

  if not found
    or v_invite_owner_id <> v_owner_id
    or v_revoked_at is not null then
    raise exception using errcode = '42501',
      message = 'Invitation not found, not owned, or already revoked';
  end if;

  update public.question_teacher_invites
  set revoked_at = pg_catalog.clock_timestamp()
  where id = p_invite_id
    and owner_id = v_owner_id
    and revoked_at is null;

  if not found then
    raise exception using errcode = '42501', message = 'Invitation is no longer active';
  end if;

  return v_question_id;
end;
$$;

create or replace function public.revoke_question_teacher_invite(
  p_invite_id uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_question_teacher_invite(p_invite_id);
$$;

revoke all on function private.revoke_question_teacher_invite(uuid)
  from public, anon;
grant execute on function private.revoke_question_teacher_invite(uuid)
  to authenticated, service_role;
revoke all on function public.revoke_question_teacher_invite(uuid)
  from public, anon;
grant execute on function public.revoke_question_teacher_invite(uuid)
  to authenticated;

comment on function public.revoke_question_teacher_invite(uuid) is
  'SECURITY INVOKER wrapper. Revokes a pending or accepted invitation once, using a database-generated timestamp and row lock.';
