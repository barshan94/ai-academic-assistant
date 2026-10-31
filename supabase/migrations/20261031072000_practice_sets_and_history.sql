-- Private, owner-scoped practice sets with durable attempt history.
create table public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  subject text,
  chapter text,
  topic text,
  question_count integer not null check (question_count between 1 and 50),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, owner_id)
);

create table public.practice_set_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  practice_set_id uuid not null,
  question_id uuid,
  position integer not null check (position between 1 and 50),
  question_text text not null,
  question_number text,
  subject text,
  chapter text,
  topic text,
  outcome text check (outcome in ('correct', 'partial', 'incorrect', 'skipped')),
  response_notes text check (response_notes is null or char_length(response_notes) <= 4000),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (practice_set_id, position),
  unique (practice_set_id, question_id),
  foreign key (practice_set_id, owner_id)
    references public.practice_sets(id, owner_id) on delete cascade,
  foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete set null (question_id)
);

create index practice_sets_owner_created_idx
  on public.practice_sets(owner_id, created_at desc);
create index practice_set_items_owner_set_idx
  on public.practice_set_items(owner_id, practice_set_id, position);

alter table public.practice_sets enable row level security;
alter table public.practice_set_items enable row level security;

create policy "practice_sets_owner_select" on public.practice_sets
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "practice_set_items_owner_select" on public.practice_set_items
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.practice_sets, public.practice_set_items from anon, public, authenticated;
grant select on public.practice_sets, public.practice_set_items to authenticated;

create or replace function public.create_practice_set(
  p_title text,
  p_question_ids uuid[],
  p_subject text default null,
  p_chapter text default null,
  p_topic text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_set_id uuid;
  v_count integer;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 120 then
    raise exception 'Practice set title must be 1 to 120 characters';
  end if;
  if p_question_ids is null or cardinality(p_question_ids) not between 1 and 50 then
    raise exception 'Choose between 1 and 50 questions';
  end if;
  if (select count(distinct selected.question_id) from unnest(p_question_ids) as selected(question_id)) <> cardinality(p_question_ids) then
    raise exception 'Duplicate questions are not allowed';
  end if;

  select count(*) into v_count
  from public.questions q
  where q.id = any(p_question_ids)
    and q.owner_id = v_owner_id
    and q.review_status = 'approved';
  if v_count <> cardinality(p_question_ids) then
    raise exception 'Every selected question must be your approved question';
  end if;

  insert into public.practice_sets(owner_id, title, subject, chapter, topic, question_count)
  values (v_owner_id, trim(p_title), nullif(trim(p_subject), ''), nullif(trim(p_chapter), ''), nullif(trim(p_topic), ''), cardinality(p_question_ids))
  returning id into v_set_id;

  insert into public.practice_set_items(
    owner_id, practice_set_id, question_id, position,
    question_text, question_number, subject, chapter, topic
  )
  select v_owner_id, v_set_id, q.id, selected.ordinality::integer,
    q.question_text, q.question_number, q.subject, q.chapter, q.topic
  from unnest(p_question_ids) with ordinality as selected(question_id, ordinality)
  join public.questions q on q.id = selected.question_id
  where q.owner_id = v_owner_id and q.review_status = 'approved';

  return v_set_id;
end;
$$;

create or replace function public.record_practice_answer(
  p_item_id uuid,
  p_outcome text,
  p_response_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_set_id uuid;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_outcome is null or p_outcome not in ('correct', 'partial', 'incorrect', 'skipped') then
    raise exception 'Invalid practice outcome';
  end if;
  if p_response_notes is not null and char_length(p_response_notes) > 4000 then
    raise exception 'Response notes must be 4,000 characters or fewer';
  end if;

  update public.practice_set_items
  set outcome = p_outcome, response_notes = nullif(trim(p_response_notes), ''),
      answered_at = now()
  where id = p_item_id and owner_id = v_owner_id
  returning practice_set_id into v_set_id;

  if v_set_id is null then raise exception 'Practice item not found'; end if;

  update public.practice_sets s
  set status = case when not exists (
        select 1 from public.practice_set_items i
        where i.practice_set_id = s.id and i.owner_id = v_owner_id
          and i.outcome is null
      ) then 'completed' else 'in_progress' end,
      completed_at = case when not exists (
        select 1 from public.practice_set_items i
        where i.practice_set_id = s.id and i.owner_id = v_owner_id
          and i.outcome is null
      ) then coalesce(s.completed_at, now()) else null end
  where s.id = v_set_id and s.owner_id = v_owner_id;
end;
$$;

revoke all on function public.create_practice_set(text, uuid[], text, text, text) from public, anon;
grant execute on function public.create_practice_set(text, uuid[], text, text, text) to authenticated;
revoke all on function public.record_practice_answer(uuid, text, text) from public, anon;
grant execute on function public.record_practice_answer(uuid, text, text) to authenticated;
