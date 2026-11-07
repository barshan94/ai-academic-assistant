begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'quiz-edit-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'quiz-edit-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status)
values ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'quiz-edit-source.pdf', 'application/pdf', 1024, 'ready');
insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values ('63000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 1, 'Quiz edit source', 'manual', 'complete');
insert into public.questions (id, owner_id, document_id, document_page_id, question_text, subject, chapter, review_status)
values ('64000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', '63000000-0000-4000-8000-000000000001', 'What is velocity?', 'Physics', 'Motion', 'approved');

select ok(has_function_privilege('authenticated', 'public.update_generated_quiz_question(uuid,integer,text,text,text)', 'EXECUTE'), 'authenticated users can call the draft question edit RPC');
select ok(not has_function_privilege('anon', 'public.update_generated_quiz_question(uuid,integer,text,text,text)', 'EXECUTE'), 'anonymous users cannot call the draft question edit RPC');
select ok(not has_table_privilege('authenticated', 'public.generated_quizzes', 'UPDATE'), 'authenticated users cannot bypass the edit RPC');

create temporary table quiz_edit_fixture (id uuid);
set local role authenticated;
set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","email":"quiz-edit-owner@example.test"}';

insert into quiz_edit_fixture
select public.save_generated_quiz_draft(
  'Editable motion quiz',
  'Physics',
  'Motion',
  '{"title":"Editable motion quiz","instructions":"Choose one answer","questions":[{"type":"mcq","prompt":"What is velocity?","options":["Speed in a direction","Distance only","Mass times acceleration","Change in energy"],"correctAnswer":"Speed in a direction","explanation":"Velocity is speed with direction.","difficulty":"easy","sourceRefs":["S1"]}]}'::jsonb,
  array['64000000-0000-4000-8000-000000000001']::uuid[]
);

select ok((select id is not null from quiz_edit_fixture), 'owner can create a quiz draft for edit tests');
select is(
  public.update_generated_quiz_question((select id from quiz_edit_fixture), 0, 'Define velocity.', 'Speed in a direction', 'Velocity is speed with direction.'),
  true,
  'owner can edit prompt and explanation on an unpublished draft'
);
select is(
  (select quiz_json->'questions'->0->>'prompt' from public.generated_quizzes where id=(select id from quiz_edit_fixture)),
  'Define velocity.',
  'edited prompt is persisted'
);
select is(
  (select quiz_json->'questions'->0->>'explanation' from public.generated_quizzes where id=(select id from quiz_edit_fixture)),
  'Velocity is speed with direction.',
  'edited explanation is persisted'
);

select throws_ok(
  $sql$select public.update_generated_quiz_question((select id from quiz_edit_fixture), 0, 'Define velocity.', 'Wrong answer', 'Explanation')$sql$,
  'P0001', 'MCQ answer must match one of its options',
  'MCQ correct answer must remain one of the existing options'
);

set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated","email":"quiz-edit-other@example.test"}';
select is(
  public.update_generated_quiz_question((select id from quiz_edit_fixture), 0, 'Forged prompt', 'Speed in a direction', 'Forged explanation'),
  false,
  'another account cannot edit the owner quiz'
);

set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","email":"quiz-edit-owner@example.test"}';
select public.update_generated_quiz_status((select id from quiz_edit_fixture), 'approved');
select throws_ok(
  $sql$select public.update_generated_quiz_question((select id from quiz_edit_fixture), 0, 'Late edit', 'Speed in a direction', 'Late explanation')$sql$,
  'P0001', 'Only quiz drafts can be edited',
  'approved quiz content is immutable through the draft edit RPC'
);

select * from finish();
rollback;
