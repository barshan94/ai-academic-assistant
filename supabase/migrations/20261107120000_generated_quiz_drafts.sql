-- Teacher-owned, source-linked quiz drafts. Student delivery is deliberately
-- unavailable until a separate student membership/access model is implemented.
create table public.generated_quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 120),
  chapter text check (chapter is null or char_length(chapter) <= 160),
  question_count integer not null check (question_count between 1 and 30),
  quiz_json jsonb not null check (
    jsonb_typeof(quiz_json) = 'object'
    and jsonb_typeof(quiz_json->'questions') = 'array'
    and jsonb_array_length(quiz_json->'questions') between 1 and 30
  ),
  source_question_ids uuid[] not null check (
    cardinality(source_question_ids) between 1 and 20
  ),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (id, owner_id)
);

create index generated_quizzes_owner_created_idx
  on public.generated_quizzes(owner_id, created_at desc);

alter table public.generated_quizzes enable row level security;
create policy "generated_quizzes_owner_select"
  on public.generated_quizzes for select to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.generated_quizzes from public, anon, authenticated;
grant select on public.generated_quizzes to authenticated;

create or replace function public.save_generated_quiz_draft(
  p_title text,
  p_subject text,
  p_chapter text,
  p_quiz_json jsonb,
  p_source_question_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_quiz_id uuid;
  v_count integer;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'Invalid quiz title';
  end if;
  if p_subject is null or char_length(trim(p_subject)) not between 1 and 120 then
    raise exception 'Invalid quiz subject';
  end if;
  if p_chapter is not null and char_length(p_chapter) > 160 then
    raise exception 'Invalid quiz chapter';
  end if;
  if p_quiz_json is null or jsonb_typeof(p_quiz_json) <> 'object'
     or octet_length(p_quiz_json::text) > 250000
     or jsonb_typeof(p_quiz_json->'questions') <> 'array'
     or jsonb_array_length(p_quiz_json->'questions') not between 1 and 30 then
    raise exception 'Invalid quiz content';
  end if;
  if p_source_question_ids is null or cardinality(p_source_question_ids) not between 1 and 20 then
    raise exception 'Choose between 1 and 20 source questions';
  end if;
  if (select count(distinct selected.id) from unnest(p_source_question_ids) as selected(id))
     <> cardinality(p_source_question_ids) then
    raise exception 'Duplicate source questions are not allowed';
  end if;

  select count(*) into v_count
  from public.questions q
  where q.id = any(p_source_question_ids)
    and q.owner_id = v_owner_id
    and q.review_status = 'approved';
  if v_count <> cardinality(p_source_question_ids) then
    raise exception 'Every source must be your approved question';
  end if;

  insert into public.generated_quizzes(
    owner_id, title, subject, chapter, question_count, quiz_json, source_question_ids
  ) values (
    v_owner_id, trim(p_title), trim(p_subject), nullif(trim(p_chapter), ''),
    jsonb_array_length(p_quiz_json->'questions'), p_quiz_json, p_source_question_ids
  ) returning id into v_quiz_id;
  return v_quiz_id;
end;
$$;

create or replace function public.update_generated_quiz_status(
  p_quiz_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_current_status text;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_status not in ('approved', 'archived') then
    raise exception 'Invalid quiz status';
  end if;

  select status into v_current_status
  from public.generated_quizzes
  where id = p_quiz_id and owner_id = v_owner_id
  for update;
  if v_current_status is null then return false; end if;
  if v_current_status = 'archived' then
    raise exception 'Archived quizzes cannot be changed';
  end if;

  update public.generated_quizzes
  set status = p_status,
      reviewed_at = case when p_status = 'approved' then now() else reviewed_at end
  where id = p_quiz_id and owner_id = v_owner_id;
  return true;
end;
$$;

revoke all on function public.save_generated_quiz_draft(text, text, text, jsonb, uuid[]) from public, anon;
grant execute on function public.save_generated_quiz_draft(text, text, text, jsonb, uuid[]) to authenticated;
revoke all on function public.update_generated_quiz_status(uuid, text) from public, anon;
grant execute on function public.update_generated_quiz_status(uuid, text) to authenticated;
