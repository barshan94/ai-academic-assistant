-- Run ONLY in a dedicated Supabase E2E project after applying every repository migration.
-- Replace the email below with the dedicated E2E owner account email.
-- This creates one harmless PDF metadata row, one approved question, and one generated answer.
-- Copy the returned question_id and solution_id into GitHub repository Actions secrets.

do $$
declare
  owner_user_id uuid;
  seeded_document_id uuid;
  seeded_question_id uuid;
  seeded_solution_id uuid;
begin
  select id into owner_user_id
  from auth.users
  where lower(email) = lower('OWNER_E2E_EMAIL_HERE')
  limit 1;

  if owner_user_id is null then
    raise exception 'Create the dedicated owner auth user first, then replace OWNER_E2E_EMAIL_HERE.';
  end if;

  insert into public.documents (
    owner_id, file_name, mime_type, file_size_bytes, status
  ) values (
    owner_user_id, 'e2e-seed.pdf', 'application/pdf', 1, 'ready'
  )
  returning id into seeded_document_id;

  insert into public.questions (
    owner_id, document_id, question_number, question_text,
    board, qualification, subject, chapter, topic, review_status
  ) values (
    owner_user_id, seeded_document_id, 'E2E-1',
    'A body travels 100 metres in 20 seconds. Calculate its average speed.',
    'E2E', 'Test', 'Physics', 'Motion', 'Speed', 'approved'
  )
  returning id into seeded_question_id;

  insert into public.question_solutions (
    owner_id, question_id, provider, model, prompt_version,
    answer_json, verification_status
  ) values (
    owner_user_id, seeded_question_id, 'e2e-fixture', 'no-ai-cost', 'e2e-fixture-v1',
    '{
      "examAnswer": "Average speed = total distance / total time = 100 / 20 = 5 m/s.",
      "workingSteps": [{"step":"Use the speed formula","explanation":"Divide total distance by total time."}],
      "calculationChecks": [{"expression":"100 / 20","claimedResult":5,"unit":"m/s"}],
      "chemistryChecks": [],
      "physicsChecks": [],
      "bengaliExplanation": "গড় দ্রুতি = মোট দূরত্ব ÷ মোট সময় = ১০০ ÷ ২০ = ৫ মি/সে।",
      "englishExplanation": "Average speed is the total distance divided by the total time.",
      "keyConcepts": ["Average speed"],
      "assumptions": ["Motion is measured over the full 20-second interval."],
      "limitations": ["This fixture tests access and review, not AI answer quality."]
    }'::jsonb,
    'generated'
  )
  returning id into seeded_solution_id;

  raise notice 'E2E_QUESTION_ID=%', seeded_question_id;
  raise notice 'E2E_SOLUTION_ID=%', seeded_solution_id;
end $$;
