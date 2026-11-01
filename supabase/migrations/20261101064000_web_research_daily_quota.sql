create table public.question_web_research_daily_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 21),
  primary key (owner_id, day_started_at)
);

alter table public.question_web_research_daily_limits enable row level security;
revoke all on public.question_web_research_daily_limits from public, anon, authenticated;

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
  v_window_count integer;
  v_day_count integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

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

  insert into public.question_web_research_daily_limits(owner_id, day_started_at, request_count)
  values (v_owner_id, v_day_started_at, 1)
  on conflict (owner_id, day_started_at)
  do update set request_count = least(public.question_web_research_daily_limits.request_count + 1, 21)
  returning request_count into v_day_count;

  if v_day_count > 20 then
    return false;
  end if;

  insert into public.question_web_research_rate_limits(owner_id, window_started_at, request_count)
  values (v_owner_id, v_window_started_at, 1)
  on conflict (owner_id, window_started_at)
  do update set request_count = least(public.question_web_research_rate_limits.request_count + 1, 6)
  returning request_count into v_window_count;

  return v_window_count <= 5;
end;
$$;

revoke all on function public.consume_question_web_research_quota() from public, anon;
grant execute on function public.consume_question_web_research_quota() to authenticated;
