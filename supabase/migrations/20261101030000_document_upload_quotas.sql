-- Bound owner-initiated archive creation independently of AI inference quotas.
create table public.document_upload_rate_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  window_kind text not null check (window_kind in ('hour', 'day')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 51),
  primary key (owner_id, window_kind, window_started_at)
);

alter table public.document_upload_rate_limits enable row level security;
revoke all on public.document_upload_rate_limits from public, anon, authenticated;

create or replace function public.consume_document_upload_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_hour_started_at timestamptz;
  v_day_started_at timestamptz;
  v_hour_count integer;
  v_day_count integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  v_hour_started_at := to_timestamp(floor(extract(epoch from v_now) / 3600) * 3600);
  v_day_started_at := to_timestamp(floor(extract(epoch from v_now) / 86400) * 86400);

  delete from public.document_upload_rate_limits
  where owner_id = v_owner_id
    and window_started_at < v_now - interval '2 days';

  insert into public.document_upload_rate_limits(owner_id, window_kind, window_started_at, request_count)
  values (v_owner_id, 'hour', v_hour_started_at, 1)
  on conflict (owner_id, window_kind, window_started_at)
  do update set request_count = least(public.document_upload_rate_limits.request_count + 1, 11)
  returning request_count into v_hour_count;

  insert into public.document_upload_rate_limits(owner_id, window_kind, window_started_at, request_count)
  values (v_owner_id, 'day', v_day_started_at, 1)
  on conflict (owner_id, window_kind, window_started_at)
  do update set request_count = least(public.document_upload_rate_limits.request_count + 1, 51)
  returning request_count into v_day_count;

  return v_hour_count <= 10 and v_day_count <= 50;
end;
$$;

revoke all on function public.consume_document_upload_quota() from public, anon;
grant execute on function public.consume_document_upload_quota() to authenticated;

comment on function public.consume_document_upload_quota() is
  'Atomically limits owner-created Drive upload sessions to 10 per UTC hour and 50 per UTC day.';
