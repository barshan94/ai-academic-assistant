-- Pending teacher invitations expire after seven days. Acceptance is atomic,
-- checks the authenticated user's verified Auth email, and cannot race revocation.
-- Accepted invitations remain valid until explicitly revoked.

alter table public.question_teacher_invites
  add column expires_at timestamptz;

update public.question_teacher_invites
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.question_teacher_invites
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null,
  add constraint question_teacher_invites_expiry_window_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '30 days'
    );

-- A time-dependent partial unique index cannot safely model expiry. Serialize
-- creation per owner/question/email in the RPC and allow re-issue after expiry.
drop index if exists public.question_teacher_invites_active_email_unique;
create index question_teacher_invites_pending_expiry_idx
  on public.question_teacher_invites (owner_id, question_id, invited_email, expires_at)
  where accepted_by is null and revoked_at is null;

-- Invitees no longer mutate acceptance columns directly. They must use the
-- authenticated RPC, which checks the verified Auth email and locks the row.
revoke update on public.question_teacher_invites from authenticated;
revoke update (accepted_by, accepted_at, revoked_at)
  on public.question_teacher_invites from authenticated;
grant update (revoked_at) on public.question_teacher_invites to authenticated;

drop policy if exists "question_teacher_invites_update_accept_or_revoke"
  on public.question_teacher_invites;
create policy "question_teacher_invites_owner_revoke"
  on public.question_teacher_invites
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    and revoked_at is null
  )
  with check (
    owner_id = (select auth.uid())
    and revoked_at is not null
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.create_question_teacher_invite(
  p_question_id uuid,
  p_invited_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_email text := lower(trim(coalesce(p_invited_email, '')));
  v_owner_email text;
  v_existing_id uuid;
  v_invite_id uuid;
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_question_id is null
    or length(v_email) not between 3 and 320
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid invitation details';
  end if;

  select lower(u.email)
    into v_owner_email
  from auth.users as u
  where u.id = v_owner_id;

  if v_owner_email is not null and v_owner_email = v_email then
    raise exception using errcode = '22023', message = 'Cannot invite the question owner';
  end if;

  if not exists (
    select 1
    from public.questions as q
    where q.id = p_question_id
      and q.owner_id = v_owner_id
  ) then
    raise exception using errcode = '42501', message = 'Question not found or not owned';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_owner_id::text || ':' || p_question_id::text || ':' || v_email,
      0
    )
  );

  select invite.id
    into v_existing_id
  from public.question_teacher_invites as invite
  where invite.owner_id = v_owner_id
    and invite.question_id = p_question_id
    and invite.invited_email = v_email
    and invite.accepted_by is null
    and invite.revoked_at is null
    and invite.expires_at > pg_catalog.clock_timestamp()
  order by invite.created_at desc
  limit 1
  for update;

  if v_existing_id is not null then
    raise exception using errcode = '23505', message = 'An active invitation already exists';
  end if;

  insert into public.question_teacher_invites (
    question_id, owner_id, invited_email
  ) values (
    p_question_id, v_owner_id, v_email
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create or replace function public.create_question_teacher_invite(
  p_question_id uuid,
  p_invited_email text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_question_teacher_invite(
    p_question_id,
    p_invited_email
  );
$$;

create or replace function private.accept_question_teacher_invite(
  p_invite_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_confirmed_at timestamptz;
  v_question_id uuid;
  v_owner_id uuid;
  v_invited_email text;
  v_accepted_by uuid;
  v_accepted_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_email_confirmed_at
  from auth.users as u
  where u.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'A verified account email is required';
  end if;

  select invite.question_id, invite.owner_id, invite.invited_email,
         invite.accepted_by, invite.accepted_at, invite.revoked_at, invite.expires_at
    into v_question_id, v_owner_id, v_invited_email,
         v_accepted_by, v_accepted_at, v_revoked_at, v_expires_at
  from public.question_teacher_invites as invite
  where invite.id = p_invite_id
  for update;

  if not found
    or v_owner_id = v_user_id
    or v_invited_email <> v_email
    or v_accepted_by is not null
    or v_accepted_at is not null
    or v_revoked_at is not null
    or v_expires_at <= pg_catalog.clock_timestamp() then
    raise exception using errcode = '42501',
      message = 'Invitation is unavailable, expired, revoked, already accepted, or assigned to another email';
  end if;

  update public.question_teacher_invites
  set accepted_by = v_user_id,
      accepted_at = pg_catalog.clock_timestamp()
  where id = p_invite_id
    and accepted_by is null
    and accepted_at is null
    and revoked_at is null
    and expires_at > pg_catalog.clock_timestamp();

  if not found then
    raise exception using errcode = '42501', message = 'Invitation is no longer available';
  end if;

  return v_question_id;
end;
$$;

create or replace function public.accept_question_teacher_invite(
  p_invite_id uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_question_teacher_invite(p_invite_id);
$$;

revoke all on function private.create_question_teacher_invite(uuid, text)
  from public, anon;
revoke all on function private.accept_question_teacher_invite(uuid)
  from public, anon;
grant execute on function private.create_question_teacher_invite(uuid, text)
  to authenticated, service_role;
grant execute on function private.accept_question_teacher_invite(uuid)
  to authenticated, service_role;

revoke all on function public.create_question_teacher_invite(uuid, text)
  from public, anon;
revoke all on function public.accept_question_teacher_invite(uuid)
  from public, anon;
grant execute on function public.create_question_teacher_invite(uuid, text)
  to authenticated;
grant execute on function public.accept_question_teacher_invite(uuid)
  to authenticated;

comment on column public.question_teacher_invites.expires_at is
  'Invitation acceptance deadline. Expiry applies only while pending; accepted access remains until revoked.';
