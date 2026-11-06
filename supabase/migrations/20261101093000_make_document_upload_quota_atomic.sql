create or replace function public.consume_document_upload_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_now timestamptz;
  v_hour_started_at timestamptz;
  v_day_started_at timestamptz;
  v_hour_count integer := 0;
  v_day_count integer := 0;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  -- Serialize all upload-quota decisions for this owner.
  perform pg_catalog.pg_advisory_xact_lock(
    2,
    pg_catalog.hashtext(v_owner_id::text)
  );

  -- Capture the time only after the lock so waits cannot use an expired quota window.
  v_now := clock_timestamp();
  v_hour_started_at := to_timestamp(floor(extract(epoch from v_now) / 3600) * 3600);
  v_day_started_at := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';

  delete from public.document_upload_rate_limits
  where owner_id = v_owner_id
    and window_started_at < v_now - interval '2 days';

  select request_count
  into v_hour_count
  from public.document_upload_rate_limits
  where owner_id = v_owner_id
    and window_kind = 'hour'
    and window_started_at = v_hour_started_at;

  select request_count
  into v_day_count
  from public.document_upload_rate_limits
  where owner_id = v_owner_id
    and window_kind = 'day'
    and window_started_at = v_day_started_at;

  -- A rejected upload must not consume the other quota allowance.
  if coalesce(v_hour_count, 0) >= 10
    or coalesce(v_day_count, 0) >= 50 then
    return false;
  end if;

  insert into public.document_upload_rate_limits (
    owner_id,
    window_kind,
    window_started_at,
    request_count
  )
  values (v_owner_id, 'hour', v_hour_started_at, 1)
  on conflict (owner_id, window_kind, window_started_at)
  do update
    set request_count = public.document_upload_rate_limits.request_count + 1;

  insert into public.document_upload_rate_limits (
    owner_id,
    window_kind,
    window_started_at,
    request_count
  )
  values (v_owner_id, 'day', v_day_started_at, 1)
  on conflict (owner_id, window_kind, window_started_at)
  do update
    set request_count = public.document_upload_rate_limits.request_count + 1;

  return true;
end;
$$;

revoke all on function public.consume_document_upload_quota() from public, anon;
grant execute on function public.consume_document_upload_quota() to authenticated;

comment on function public.consume_document_upload_quota() is
  'Atomically limits owner-created Drive upload sessions to 10 per UTC hour and 50 per UTC day.';
