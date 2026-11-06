-- Owner-initiated web research results are retained as source leads, not verified evidence.
create table public.question_web_research_rate_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 6),
  primary key (owner_id, window_started_at)
);

alter table public.question_web_research_rate_limits enable row level security;
revoke all on public.question_web_research_rate_limits from public, anon, authenticated;

create or replace function public.consume_question_web_research_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_window_seconds constant integer := 900;
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds
  );

  delete from public.question_web_research_rate_limits
  where owner_id = v_owner_id
    and window_started_at < clock_timestamp() - interval '1 day';

  insert into public.question_web_research_rate_limits(owner_id, window_started_at, request_count)
  values (v_owner_id, v_window_started_at, 1)
  on conflict (owner_id, window_started_at)
  do update set request_count = least(public.question_web_research_rate_limits.request_count + 1, 6)
  returning request_count into v_request_count;

  return v_request_count <= 5;
end;
$$;

revoke all on function public.consume_question_web_research_quota() from public, anon;
grant execute on function public.consume_question_web_research_quota() to authenticated;

create table public.question_web_research_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null,
  query text not null check (length(trim(query)) between 3 and 500),
  provider text not null check (length(trim(provider)) between 1 and 60),
  title text not null check (length(trim(title)) between 1 and 300),
  source_url text not null check (source_url ~* '^https://[^[:space:]/?#]+([/?#][^[:space:]]*)?$'),
  snippet text not null check (length(trim(snippet)) between 1 and 2000),
  result_rank integer not null check (result_rank between 1 and 10),
  retrieved_at timestamptz not null default now(),
  constraint question_web_research_sources_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade
);

create index question_web_research_sources_owner_question_idx
  on public.question_web_research_sources(owner_id, question_id, retrieved_at desc);

alter table public.question_web_research_sources enable row level security;

create policy question_web_research_sources_owner_select
  on public.question_web_research_sources for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy question_web_research_sources_owner_insert
  on public.question_web_research_sources for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.owner_id = (select auth.uid())
    )
  );

revoke all on public.question_web_research_sources from public, anon;
grant select, insert on public.question_web_research_sources to authenticated;

comment on table public.question_web_research_sources is
  'Append-only owner-private web search result leads. Search snippets are unverified and are not treated as official syllabus or mark-scheme evidence.';
