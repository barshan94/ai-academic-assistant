create or replace function public.consume_question_web_research_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_window_seconds constant integer := 900;
  v_window_started_at timestamptz;
  v_day_started_at timestamptz;
  v_window_count integer := 0;
  v_day_count integer := 0;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize quota decisions per owner so concurrent requests cannot both
  -- pass a limit check and overspend either allowance.
  perform pg_catalog.pg_advisory_xact_lock(
    0,
    pg_catalog.hashtext(v_owner_id::text)
  );

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );
  v_day_started_at := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';

  delete from public.question_web_research_rate_limits
  where owner_id = v_owner_id
    and window_started_at < v_now - interval '1 day';

  delete from public.question_web_research_daily_limits
  where owner_id = v_owner_id
    and day_started_at < v_day_started_at;

  select request_count
  into v_day_count
  from public.question_web_research_daily_limits
  where owner_id = v_owner_id
    and day_started_at = v_day_started_at;

  select request_count
  into v_window_count
  from public.question_web_research_rate_limits
  where owner_id = v_owner_id
    and window_started_at = v_window_started_at;

  -- Reject before writing either counter. A rejected request must not consume
  -- the other allowance.
  if coalesce(v_day_count, 0) >= 20
    or coalesce(v_window_count, 0) >= 5 then
    return false;
  end if;

  insert into public.question_web_research_daily_limits (
    owner_id,
    day_started_at,
    request_count
  )
  values (v_owner_id, v_day_started_at, 1)
  on conflict (owner_id, day_started_at)
  do update
    set request_count = public.question_web_research_daily_limits.request_count + 1;

  insert into public.question_web_research_rate_limits (
    owner_id,
    window_started_at,
    request_count
  )
  values (v_owner_id, v_window_started_at, 1)
  on conflict (owner_id, window_started_at)
  do update
    set request_count = public.question_web_research_rate_limits.request_count + 1;

  return true;
end;
$$;

revoke all on function public.consume_question_web_research_quota() from public, anon;
grant execute on function public.consume_question_web_research_quota() to authenticated;
