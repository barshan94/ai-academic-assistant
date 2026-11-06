create or replace function public.consume_ai_generation_quota(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_limit integer;
  v_window_seconds constant integer := 900;
  v_now timestamptz;
  v_window_started_at timestamptz;
  v_request_count integer := 0;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  v_limit := case p_bucket
    when 'ai-solution' then 5
    when 'ai-chapter-note' then 3
    else null
  end;
  if v_limit is null then
    raise exception 'Unsupported AI generation bucket';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    3,
    pg_catalog.hashtext(v_owner_id::text || ':' || p_bucket)
  );

  -- Take the time after the lock to avoid assigning a delayed request to an
  -- expired 15-minute window.
  v_now := clock_timestamp();
  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );

  delete from public.ai_generation_rate_limits
  where owner_id = v_owner_id
    and window_started_at < v_now - interval '1 day';

  select request_count
  into v_request_count
  from public.ai_generation_rate_limits
  where owner_id = v_owner_id
    and bucket = p_bucket
    and window_started_at = v_window_started_at;

  if coalesce(v_request_count, 0) >= v_limit then
    return false;
  end if;

  insert into public.ai_generation_rate_limits (
    owner_id,
    bucket,
    window_started_at,
    request_count
  )
  values (
    v_owner_id,
    p_bucket,
    v_window_started_at,
    1
  )
  on conflict (owner_id, bucket, window_started_at)
  do update
    set request_count = public.ai_generation_rate_limits.request_count + 1;

  return true;
end;
$$;

revoke all on function public.consume_ai_generation_quota(text) from public, anon;
grant execute on function public.consume_ai_generation_quota(text) to authenticated;
