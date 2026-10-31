-- Atomic account-scoped quotas for expensive AI provider actions.
create table public.ai_generation_rate_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('ai-solution', 'ai-chapter-note')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 6),
  primary key (owner_id, bucket, window_started_at)
);

alter table public.ai_generation_rate_limits enable row level security;
revoke all on public.ai_generation_rate_limits from public, anon, authenticated;

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
  v_window_started_at timestamptz;
  v_request_count integer;
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

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds
  );

  delete from public.ai_generation_rate_limits
  where owner_id = v_owner_id
    and window_started_at < clock_timestamp() - interval '1 day';

  insert into public.ai_generation_rate_limits(owner_id, bucket, window_started_at, request_count)
  values (v_owner_id, p_bucket, v_window_started_at, 1)
  on conflict (owner_id, bucket, window_started_at)
  do update set request_count = least(
    public.ai_generation_rate_limits.request_count + 1,
    v_limit + 1
  )
  returning request_count into v_request_count;

  return v_request_count <= v_limit;
end;
$$;

revoke all on function public.consume_ai_generation_quota(text) from public, anon;
grant execute on function public.consume_ai_generation_quota(text) to authenticated;
