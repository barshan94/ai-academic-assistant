-- Server-side practice selection and distinct filter values.
-- Both functions are owner-scoped through auth.uid(); the browser never downloads
-- the full question bank to build filter options or select practice questions.

create or replace function public.get_practice_filter_options()
returns table(option_type text, option_value text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct 'subject'::text, q.subject
  from public.questions q
  where q.owner_id = (select auth.uid())
    and q.review_status = 'approved'
    and nullif(btrim(q.subject), '') is not null
  union
  select distinct 'chapter'::text, q.chapter
  from public.questions q
  where q.owner_id = (select auth.uid())
    and q.review_status = 'approved'
    and nullif(btrim(q.chapter), '') is not null
  union
  select distinct 'topic'::text, q.topic
  from public.questions q
  where q.owner_id = (select auth.uid())
    and q.review_status = 'approved'
    and nullif(btrim(q.topic), '') is not null
  order by 1, 2;
$$;

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
  v_question_ids uuid[];
  v_selected_count integer;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Practice set title must be 1 to 120 characters';
  end if;
  if p_count is null or p_count not between 1 and 50 then
    raise exception 'Choose between 1 and 50 questions';
  end if;

  select array_agg(selected.id order by selected.created_at desc, selected.id desc),
         count(*)::integer
    into v_question_ids, v_selected_count
  from (
    select q.id, q.created_at
    from public.questions q
    where q.owner_id = v_owner_id
      and q.review_status = 'approved'
      and (nullif(btrim(p_subject), '') is null or q.subject = btrim(p_subject))
      and (nullif(btrim(p_chapter), '') is null or q.chapter = btrim(p_chapter))
      and (nullif(btrim(p_topic), '') is null or q.topic = btrim(p_topic))
    order by q.created_at desc, q.id desc
    limit p_count
  ) selected;

  if coalesce(v_selected_count, 0) = 0 then
    raise exception 'No approved questions match the selected filters';
  end if;
  if v_selected_count < p_count then
    raise exception 'Not enough matching approved questions for the requested set size';
  end if;

  return public.create_practice_set(
    p_title,
    v_question_ids,
    nullif(btrim(p_subject), ''),
    nullif(btrim(p_chapter), ''),
    nullif(btrim(p_topic), '')
  );
end;
$$;

revoke all on function public.get_practice_filter_options() from public, anon;
grant execute on function public.get_practice_filter_options() to authenticated;
revoke all on function public.create_practice_set_from_filters(text, integer, text, text, text) from public, anon;
grant execute on function public.create_practice_set_from_filters(text, integer, text, text, text) to authenticated;
