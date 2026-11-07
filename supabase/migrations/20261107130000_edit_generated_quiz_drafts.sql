create or replace function public.update_generated_quiz_question(
  p_quiz_id uuid,
  p_question_index integer,
  p_prompt text,
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
  v_options jsonb;
  v_type text;
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
  v_options := v_question->'options';
  if v_type not in ('mcq', 'short_answer') or jsonb_typeof(v_options) <> 'array' then
    raise exception 'Stored quiz question is invalid';
  end if;
  if v_type = 'mcq' and not exists (
    select 1 from jsonb_array_elements_text(v_options) as option_value(value)
    where option_value.value = trim(p_correct_answer)
  ) then
    raise exception 'MCQ answer must match one of its options';
  end if;
  if v_type = 'short_answer' and jsonb_array_length(v_options) <> 0 then
    raise exception 'Short-answer options must be empty';
  end if;

  v_question := jsonb_set(v_question, '{prompt}', to_jsonb(trim(p_prompt)), true);
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

revoke all on function public.update_generated_quiz_question(uuid, integer, text, text, text) from public, anon;
grant execute on function public.update_generated_quiz_question(uuid, integer, text, text, text) to authenticated;
