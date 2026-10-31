-- Remove the application-side 500-question ceiling from practice creation.
-- Only compact distinct filter values and the requested question IDs cross the API.

create or replace function public.get_practice_filter_options()
returns table(option_type text, option_value text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  return query
    select 'subject'::text, btrim(q.subject)
    from public.questions q
    where q.owner_id = v_owner_id
      and q.review_status = 'approved'
      and nullif(btrim(q.subject), '') is not null
    group by btrim(q.subject)
    union all
    select 'chapter'::text, btrim(q.chapter)
    from public.questions q
    where q.owner_id = v_owner_id
      and q.review_status = 'approved'
      and nullif(btrim(q.chapter), '') is not null
    group by btrim(q.chapter)
    union all
    select 'topic'::text, btrim(q.topic)
    from public.questions q
    where q.owner_id = v_owner_id
      and q.review_status = 'approved'
      and nullif(btrim(q.topic), '') is not null
    group by btrim(q.topic)
    order by 1, 2;
end;
$$;

revoke all on function public.get_practice_filter_options() from public, anon;
grant execute on function public.get_practice_filter_options() to authenticated;

create or replace function public.create_practice_set_from_filters(
  p_title text,
  p_count integer,
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
  v_question_ids uuid[];
  v_matching_count bigint;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 120 then
    raise exception 'Practice set title must be 1 to 120 characters';
  end if;
  if p_count is null or p_count not between 1 and 50 then
    raise exception 'Choose between 1 and 50 questions';
  end if;
  if p_subject is not null and char_length(p_subject) > 120 then
    raise exception 'Subject filter is too long';
  end if;
  if p_chapter is not null and char_length(p_chapter) > 160 then
    raise exception 'Chapter filter is too long';
  end if;
  if p_topic is not null and char_length(p_topic) > 160 then
    raise exception 'Topic filter is too long';
  end if;

  select count(*) into v_matching_count
  from public.questions q
  where q.owner_id = v_owner_id
    and q.review_status = 'approved'
    and (nullif(trim(p_subject), '') is null or btrim(q.subject) = trim(p_subject))
    and (nullif(trim(p_chapter), '') is null or btrim(q.chapter) = trim(p_chapter))
    and (nullif(trim(p_topic), '') is null or btrim(q.topic) = trim(p_topic));

  if v_matching_count = 0 then
    raise exception 'No approved questions match those filters';
  end if;
  if v_matching_count < p_count then
    raise exception 'Not enough matching approved questions for this set size';
  end if;

  select array_agg(candidate.id)
  into v_question_ids
  from (
    select q.id
    from public.questions q
    where q.owner_id = v_owner_id
      and q.review_status = 'approved'
      and (nullif(trim(p_subject), '') is null or btrim(q.subject) = trim(p_subject))
      and (nullif(trim(p_chapter), '') is null or btrim(q.chapter) = trim(p_chapter))
      and (nullif(trim(p_topic), '') is null or btrim(q.topic) = trim(p_topic))
    order by random()
    limit p_count
  ) candidate;

  if coalesce(cardinality(v_question_ids), 0) <> p_count then
    raise exception 'Could not select the requested number of approved questions';
  end if;

  insert into public.practice_sets(owner_id, title, subject, chapter, topic, question_count)
  values (
    v_owner_id,
    trim(p_title),
    nullif(trim(p_subject), ''),
    nullif(trim(p_chapter), ''),
    nullif(trim(p_topic), ''),
    p_count
  )
  returning id into v_set_id;

  insert into public.practice_set_items(
    owner_id, practice_set_id, question_id, position,
    question_text, question_number, subject, chapter, topic
  )
  select
    v_owner_id, v_set_id, q.id, selected.ordinality::integer,
    q.question_text, q.question_number, q.subject, q.chapter, q.topic
  from unnest(v_question_ids) with ordinality as selected(question_id, ordinality)
  join public.questions q
    on q.id = selected.question_id
   and q.owner_id = v_owner_id
   and q.review_status = 'approved';

  return v_set_id;
end;
$$;

revoke all on function public.create_practice_set_from_filters(text, integer, text, text, text) from public, anon;
grant execute on function public.create_practice_set_from_filters(text, integer, text, text, text) to authenticated;
