-- Allow owners to edit their own planned sessions without rewriting completed history.
create or replace function public.update_planned_weekly_study_session(
  p_session_id uuid,
  p_session_date date,
  p_title text,
  p_planned_minutes integer,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
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

  update public.weekly_study_sessions
  set session_date = p_session_date,
      title = trim(p_title),
      planned_minutes = p_planned_minutes,
      notes = nullif(trim(p_notes), '')
  where id = p_session_id
    and owner_id = v_owner_id
    and status = 'planned';

  if not found then raise exception 'Planned session not found'; end if;
end;
$$;

revoke all on function public.update_planned_weekly_study_session(uuid, date, text, integer, text) from public, anon;
grant execute on function public.update_planned_weekly_study_session(uuid, date, text, integer, text) to authenticated;
