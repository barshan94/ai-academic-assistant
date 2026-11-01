-- Owner-private weekly study sessions with explicit completion tracking.
create table public.weekly_study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  title text not null check (char_length(title) between 1 and 120),
  planned_minutes integer not null check (planned_minutes between 5 and 480),
  notes text check (notes is null or char_length(notes) <= 500),
  status text not null default 'planned' check (status in ('planned', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  check ((status = 'planned' and completed_at is null) or (status = 'completed' and completed_at is not null))
);

create index weekly_study_sessions_owner_date_idx
  on public.weekly_study_sessions(owner_id, session_date, created_at);

alter table public.weekly_study_sessions enable row level security;
create policy "weekly_study_sessions_owner_select" on public.weekly_study_sessions
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.weekly_study_sessions from anon, public, authenticated;
grant select on public.weekly_study_sessions to authenticated;

create or replace function public.create_weekly_study_session(
  p_session_date date,
  p_title text,
  p_planned_minutes integer,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_session_id uuid;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_session_date is null then raise exception 'Choose a session date'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 120 then
    raise exception 'Session title must be 1 to 120 characters';
  end if;
  if p_planned_minutes is null or p_planned_minutes not between 5 and 480 then
    raise exception 'Planned time must be between 5 and 480 minutes';
  end if;
  if p_notes is not null and char_length(p_notes) > 500 then
    raise exception 'Notes must be 500 characters or fewer';
  end if;

  insert into public.weekly_study_sessions(owner_id, session_date, title, planned_minutes, notes)
  values (v_owner_id, p_session_date, trim(p_title), p_planned_minutes, nullif(trim(p_notes), ''))
  returning id into v_session_id;
  return v_session_id;
end;
$$;

create or replace function public.complete_weekly_study_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  update public.weekly_study_sessions
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where id = p_session_id and owner_id = v_owner_id and status = 'planned';
  if not found then raise exception 'Planned session not found'; end if;
end;
$$;

revoke all on function public.create_weekly_study_session(date, text, integer, text) from public, anon;
grant execute on function public.create_weekly_study_session(date, text, integer, text) to authenticated;
revoke all on function public.complete_weekly_study_session(uuid) from public, anon;
grant execute on function public.complete_weekly_study_session(uuid) to authenticated;
