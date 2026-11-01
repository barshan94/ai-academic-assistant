-- Account-wide weekly calendar totals with independently paginated session rows.
create or replace function public.get_weekly_study_sessions_page(
  p_start_date date,
  p_end_date date,
  p_page integer default 1,
  p_page_size integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 50), 1), 100);
  v_result jsonb;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or p_end_date - p_start_date > 6 then
    raise exception 'Choose a valid seven-day calendar window';
  end if;

  select jsonb_build_object(
    'sessions_total', count(*),
    'planned_count', count(*) filter (where status = 'planned'),
    'completed_count', count(*) filter (where status = 'completed'),
    'planned_minutes', coalesce(sum(planned_minutes), 0),
    'completed_minutes', coalesce(sum(planned_minutes) filter (where status = 'completed'), 0),
    'sessions', coalesce((
      select jsonb_agg(to_jsonb(page_rows) order by page_rows.session_date, page_rows.created_at, page_rows.id)
      from (
        select id, session_date, title, planned_minutes, notes, status, completed_at, created_at
        from public.weekly_study_sessions
        where owner_id = v_owner_id
          and session_date between p_start_date and p_end_date
        order by session_date, created_at, id
        limit v_page_size offset ((v_page - 1) * v_page_size)
      ) page_rows
    ), '[]'::jsonb)
  ) into v_result
  from public.weekly_study_sessions
  where owner_id = v_owner_id
    and session_date between p_start_date and p_end_date;

  return v_result;
end;
$$;

revoke all on function public.get_weekly_study_sessions_page(date, date, integer, integer) from public, anon;
grant execute on function public.get_weekly_study_sessions_page(date, date, integer, integer) to authenticated;
