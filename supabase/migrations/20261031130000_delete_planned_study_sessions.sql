-- Allow owners to remove only planned calendar sessions; completed history is retained.
create or replace function public.delete_planned_weekly_study_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;

  delete from public.weekly_study_sessions
  where id = p_session_id
    and owner_id = v_owner_id
    and status = 'planned';

  if not found then
    raise exception 'Planned session not found';
  end if;
end;
$$;

revoke all on function public.delete_planned_weekly_study_session(uuid) from public, anon;
grant execute on function public.delete_planned_weekly_study_session(uuid) to authenticated;
