begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'quiz-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'quiz-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status)
values ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'quiz-source.pdf', 'application/pdf', 1024, 'ready');

insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values ('53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 1, 'Source text for quiz fixture', 'manual', 'complete');

insert into public.questions (id, owner_id, document_id, document_page_id, question_text, subject, chapter)
values ('54000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', 'What is acceleration?', 'Physics', 'Motion');

update public.questions set review_status = 'approved'
where id = '54000000-0000-4000-8000-000000000001';

select ok(
  has_function_privilege('authenticated', 'public.save_generated_quiz_draft(text,text,text,jsonb,uuid[])', 'EXECUTE'),
  'authenticated users can call the owner-checked quiz draft RPC'
);
select ok(
  not has_function_privilege('anon', 'public.save_generated_quiz_draft(text,text,text,jsonb,uuid[])', 'EXECUTE'),
  'anonymous users cannot call the quiz draft RPC'
);
select ok(
  not has_table_privilege('authenticated', 'public.generated_quizzes', 'INSERT'),
  'authenticated users cannot bypass the owner-checked insert RPC'
);

set local role authenticated;
set local request.jwt.claim.sub = '51000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated","email":"quiz-owner@example.test"}';

select is(
  (select count(*)::integer from public.generated_quizzes),
  0,
  'owner initially has no saved quiz drafts'
);

select is(
  public.save_generated_quiz_draft(
    'Motion quiz',
    'Physics',
    'Motion',
    '{"title":"Motion quiz","instructions":"Choose the best answer","questions":[{"type":"mcq","prompt":"What is acceleration?","options":["Rate of change of velocity","Rate of change of distance","Product of mass and force","Constant speed"],"correctAnswer":"Rate of change of velocity","explanation":"Acceleration is the rate of change of velocity.","difficulty":"easy","sourceRefs":["S1"]}]}'::jsonb,
    array['54000000-0000-4000-8000-000000000001']::uuid[]
  ) is not null,
  true,
  'owner can save a source-linked quiz draft from their approved question'
);

select is(
  (select status from public.generated_quizzes where title = 'Motion quiz'),
  'draft',
  'newly generated quiz is private and remains a draft'
);

select is(
  (select question_count from public.generated_quizzes where title = 'Motion quiz'),
  1,
  'question count is derived from the stored quiz JSON'
);

select is(
  public.update_generated_quiz_status(
    (select id from public.generated_quizzes where title = 'Motion quiz'),
    'approved'
  ),
  true,
  'owner can approve their own reviewed quiz'
);

select is(
  (select status from public.generated_quizzes where title = 'Motion quiz'),
  'approved',
  'approval changes only the owner-scoped review status'
);

set local request.jwt.claim.sub = '51000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated","email":"quiz-other@example.test"}';

select is(
  (select count(*)::integer from public.generated_quizzes),
  0,
  'another account cannot read the owner quiz'
);

select throws_ok(
  $sql$select public.save_generated_quiz_draft(
    'Forged quiz', 'Physics', null,
    '{"questions":[{"type":"short_answer","prompt":"Q","options":[],"correctAnswer":"A","explanation":"E","difficulty":"easy","sourceRefs":["S1"]}]}'::jsonb,
    array['54000000-0000-4000-8000-000000000001']::uuid[]
  )$sql$,
  'P0001', 'Every source must be your approved question',
  'another account cannot save a quiz using a different owner source'
);

select is(
  public.update_generated_quiz_status(
    '55000000-0000-4000-8000-000000000001',
    'approved'
  ),
  false,
  'another account cannot approve an unknown or foreign quiz'
);

select * from finish();
rollback;
