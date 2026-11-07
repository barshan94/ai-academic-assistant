create or replace function public.update_generated_quiz_question(
  p_quiz_id uuid,
  p_question_index integer,
  p_prompt text,
  p_options text[],
  p_correct_answer text,
  p_explanation text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_quiz public.generated_quizzes%rowtype;
  v_question jsonb;
  v_type text;
  v_options jsonb;
  v_clean_options text[];
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_question_index is null or p_question_index < 0 then raise exception 'Invalid question index'; end if;
  if p_prompt is null or char_length(trim(p_prompt)) not between 1 and 2000 then raise exception 'Invalid question prompt'; end if;
  if p_correct_answer is null or char_length(trim(p_correct_answer)) not between 1 and 1000 then raise exception 'Invalid answer'; end if;
  if p_explanation is null or char_length(trim(p_explanation)) not between 1 and 2000 then raise exception 'Invalid explanation'; end if;

  select * into v_quiz
  from public.generated_quizzes
  where id = p_quiz_id and owner_id = v_owner_id
  for update;

  if not found then return false; end if;
  if v_quiz.status <> 'draft' then raise exception 'Only quiz drafts can be edited'; end if;
  if p_question_index >= jsonb_array_length(v_quiz.quiz_json->'questions') then
    raise exception 'Question index is out of range';
  end if;

  v_question := v_quiz.quiz_json->'questions'->p_question_index;
  v_type := v_question->>'type';
  if v_type = 'mcq' then
    if p_options is null or cardinality(p_options) <> 4 then
      raise exception 'MCQs require exactly four options';
    end if;
    select array_agg(trim(option_text) order by ordinal)
      into v_clean_options
    from unnest(p_options) with ordinality as option_rows(option_text, ordinal);
    if exists (select 1 from unnest(v_clean_options) option_text where option_text is null or char_length(option_text) not between 1 and 500)
       or (select count(distinct option_text) from unnest(v_clean_options) option_text) <> 4 then
      raise exception 'MCQ options must be four distinct non-empty values';
    end if;
    if not (trim(p_correct_answer) = any(v_clean_options)) then
      raise exception 'MCQ answer must match one of its options';
    end if;
    v_options := to_jsonb(v_clean_options);
  elsif v_type = 'short_answer' then
    if p_options is null or cardinality(p_options) <> 0 then
      raise exception 'Short-answer options must be empty';
    end if;
    v_options := '[]'::jsonb;
  else
    raise exception 'Stored quiz question is invalid';
  end if;

  v_question := jsonb_set(v_question, '{prompt}', to_jsonb(trim(p_prompt)), true);
  v_question := jsonb_set(v_question, '{options}', v_options, true);
  v_question := jsonb_set(v_question, '{correctAnswer}', to_jsonb(trim(p_correct_answer)), true);
  v_question := jsonb_set(v_question, '{explanation}', to_jsonb(trim(p_explanation)), true);

  update public.generated_quizzes
  set quiz_json = jsonb_set(
        quiz_json,
        array['questions', p_question_index::text],
        v_question,
        false
      )
  where id = p_quiz_id and owner_id = v_owner_id;

  return true;
end;
$$;

revoke all on function public.update_generated_quiz_question(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.update_generated_quiz_question(uuid, integer, text, text[], text, text) from public, anon;
grant execute on function public.update_generated_quiz_question(uuid, integer, text, text[], text, text) to authenticated;
