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
  v_question jsonb;
  v_options jsonb;
  v_option_count integer;
  v_distinct_option_count integer;
  v_ref text;
  v_ref_number integer;
  v_type text;
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

  if p_quiz_json is null or jsonb_typeof(p_quiz_json) <> 'object'
     or octet_length(p_quiz_json::text) > 250000
     or jsonb_typeof(p_quiz_json->'title') is distinct from 'string'
     or char_length(trim(p_quiz_json->>'title')) not between 1 and 160
     or jsonb_typeof(p_quiz_json->'instructions') is distinct from 'string'
     or char_length(trim(p_quiz_json->>'instructions')) not between 1 and 1000
     or jsonb_typeof(p_quiz_json->'questions') is distinct from 'array'
     or jsonb_array_length(p_quiz_json->'questions') not between 1 and 30 then
    raise exception 'Invalid quiz content';
  end if;

  for v_question in
    select item.value from jsonb_array_elements(p_quiz_json->'questions') as item(value)
  loop
    if jsonb_typeof(v_question) is distinct from 'object'
       or coalesce(v_question->>'type', '') not in ('mcq', 'short_answer')
       or jsonb_typeof(v_question->'prompt') is distinct from 'string'
       or char_length(trim(v_question->>'prompt')) not between 1 and 2000
       or jsonb_typeof(v_question->'correctAnswer') is distinct from 'string'
       or char_length(trim(v_question->>'correctAnswer')) not between 1 and 1000
       or jsonb_typeof(v_question->'explanation') is distinct from 'string'
       or char_length(trim(v_question->>'explanation')) not between 1 and 2000
       or coalesce(v_question->>'difficulty', '') not in ('easy', 'medium', 'hard')
       or jsonb_typeof(v_question->'options') is distinct from 'array'
       or jsonb_typeof(v_question->'sourceRefs') is distinct from 'array'
       or jsonb_array_length(v_question->'sourceRefs') not between 1 and 20 then
      raise exception 'Invalid quiz question structure';
    end if;

    if exists (
      select 1 from jsonb_array_elements(v_question->'sourceRefs') as refs(value)
      where jsonb_typeof(refs.value) is distinct from 'string'
    ) then
      raise exception 'Invalid quiz source reference';
    end if;
    if (
      select count(*) from jsonb_array_elements(v_question->'sourceRefs')
    ) <> (
      select count(distinct refs.value)
      from jsonb_array_elements_text(v_question->'sourceRefs') as refs(value)
    ) then
      raise exception 'Quiz source references must be distinct';
    end if;

    for v_ref in select jsonb_array_elements_text(v_question->'sourceRefs')
    loop
      if v_ref !~ '^S([1-9]|1[0-9]|20)$' then
        raise exception 'Invalid quiz source reference';
      end if;
      v_ref_number := substring(v_ref from 2)::integer;
      if v_ref_number > cardinality(p_source_question_ids) then
        raise exception 'Quiz references an unavailable source';
      end if;
    end loop;

    v_type := v_question->>'type';
    v_options := v_question->'options';
    if v_type = 'mcq' then
      if jsonb_array_length(v_options) <> 4
         or exists (
           select 1 from jsonb_array_elements(v_options) as options(value)
           where jsonb_typeof(options.value) is distinct from 'string'
             or char_length(trim(options.value #>> '{}')) not between 1 and 500
         ) then
        raise exception 'MCQs require four non-empty text options';
      end if;
      select count(*), count(distinct option_value)
        into v_option_count, v_distinct_option_count
      from jsonb_array_elements_text(v_options) as options(option_value);
      if v_option_count <> 4 or v_distinct_option_count <> 4 then
        raise exception 'MCQ options must be distinct';
      end if;
      if not exists (
        select 1 from jsonb_array_elements_text(v_options) as options(option_value)
        where option_value = v_question->>'correctAnswer'
      ) then
        raise exception 'MCQ answer must match one of its options';
      end if;
    elsif jsonb_array_length(v_options) <> 0 then
      raise exception 'Short-answer options must be empty';
    end if;
  end loop;

  insert into public.generated_quizzes(
    owner_id, title, subject, chapter, question_count, quiz_json, source_question_ids
  ) values (
    v_owner_id, trim(p_title), trim(p_subject), nullif(trim(p_chapter), ''),
    jsonb_array_length(p_quiz_json->'questions'), p_quiz_json, p_source_question_ids
  ) returning id into v_quiz_id;
  return v_quiz_id;
end;
$$;

revoke all on function public.save_generated_quiz_draft(text, text, text, jsonb, uuid[]) from public, anon;
grant execute on function public.save_generated_quiz_draft(text, text, text, jsonb, uuid[]) to authenticated;
