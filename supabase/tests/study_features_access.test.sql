begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

-- Isolated owner and outsider fixtures. The entire test rolls back.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'study-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'study-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'study-fixture.pdf', 'application/pdf', 100);

insert into public.questions (id, owner_id, document_id, question_text, board, qualification, subject, chapter, topic, review_status)
values
  ('31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Explain Newton first law.', 'Example Board', 'O Level', 'Physics', 'Forces', 'Newton laws', 'approved'),
  ('31000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Define resultant force.', 'Example Board', 'O Level', 'Physics', 'Forces', 'Resultant force', 'approved'),
  ('31000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Unreviewed fixture question.', 'Example Board', 'O Level', 'Physics', 'Forces', 'Unreviewed', 'needs_review');

-- Owner: revision tracking, practice generation/history, insights and calendar.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"study-owner@example.test"}';

select lives_ok(
  $$select public.record_question_revision('31000000-0000-4000-8000-000000000001', 3)$$,
  'owner can record confidence for an approved question'
);
select is((select count(*)::integer from public.question_revision_progress), 1, 'owner can read their revision progress');
select throws_ok(
  $$select public.record_question_revision('31000000-0000-4000-8000-000000000003', 4)$$,
  'P0001',
  null,
  'owner cannot track a question that has not been approved'
);

select lives_ok(
  $$select public.create_practice_set(
    'Study fixture practice',
    array[
      '31000000-0000-4000-8000-000000000001'::uuid,
      '31000000-0000-4000-8000-000000000002'::uuid
    ],
    'Physics',
    'Forces',
    null
  )$$,
  'owner can create a practice set from their approved questions'
);
select is((select count(*)::integer from public.practice_sets), 1, 'owner can read their practice set');
select is((select count(*)::integer from public.practice_set_items), 2, 'practice set stores immutable question snapshots');

select lives_ok(
  $$select public.record_practice_answer(
    (select id from public.practice_set_items where owner_id = '11000000-0000-4000-8000-000000000001' and position = 1),
    'correct',
    'Fixture self-assessment'
  )$$,
  'owner can record a self-marked practice outcome'
);
select is(
  (select status from public.practice_sets where title = 'Study fixture practice'),
  'in_progress',
  'practice set remains open while an item is unanswered'
);
select is(
  (public.get_practice_insights() -> 'summary' ->> 'correct')::integer,
  1,
  'practice insights aggregate the recorded correct outcome'
);
select is(
  (select count(*)::integer from public.get_practice_filter_options() where option_type = 'subject' and option_value = 'Physics'),
  1,
  'practice filter options return distinct owner-approved subjects'
);
select lives_ok(
  $$select public.create_practice_set_from_filters('Filtered practice', 1, 'Physics', 'Forces', null)$$,
  'owner can generate a practice set from server-side filters'
);
select is(
  (public.get_study_queue_page(1, 1, 25) ->> 'practice_total')::integer,
  1,
  'study queue includes the remaining unanswered practice item'
);

select lives_ok(
  $$select public.create_weekly_study_session(date '2026-10-31', 'Study fixture session', 30, 'Original notes')$$,
  'owner can create a weekly study session'
);
select lives_ok(
  $$select public.update_planned_weekly_study_session(
    (select id from public.weekly_study_sessions where title = 'Study fixture session'),
    date '2026-11-01',
    'Updated study fixture session',
    45,
    'Updated notes'
  )$$,
  'owner can edit a planned study session'
);
select is(
  (select count(*)::integer from public.get_weekly_study_sessions_page(date '2026-10-26', date '2026-11-01', 1, 50) -> 'sessions'),
  1,
  'weekly calendar returns the owner session in the selected week'
);
select lives_ok(
  $$select public.complete_weekly_study_session((select id from public.weekly_study_sessions where title = 'Updated study fixture session'))$$,
  'owner can complete a planned study session'
);
select is(
  (select status from public.weekly_study_sessions where title = 'Updated study fixture session'),
  'completed',
  'completed session is retained as history'
);
select throws_ok(
  $$select public.delete_planned_weekly_study_session((select id from public.weekly_study_sessions where title = 'Updated study fixture session'))$$,
  'P0001',
  null,
  'owner cannot delete completed calendar history'
);
select lives_ok(
  $$select public.create_weekly_study_session(date '2026-10-31', 'Disposable planned session', 20, null)$$,
  'owner can create another planned session'
);
select lives_ok(
  $$select public.delete_planned_weekly_study_session((select id from public.weekly_study_sessions where title = 'Disposable planned session'))$$,
  'owner can delete a planned session'
);

-- Outsider: all owner data stays invisible and owner-scoped RPCs reject foreign IDs.
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"study-outsider@example.test"}';

select is((select count(*)::integer from public.question_revision_progress), 0, 'outsider cannot read revision progress');
select is((select count(*)::integer from public.practice_sets), 0, 'outsider cannot read practice sets');
select is((select count(*)::integer from public.practice_set_items), 0, 'outsider cannot read practice item snapshots');
select is((select count(*)::integer from public.weekly_study_sessions), 0, 'outsider cannot read weekly study sessions');
select throws_ok(
  $$select public.record_question_revision('31000000-0000-4000-8000-000000000001', 5)$$,
  'P0001',
  null,
  'outsider cannot add another owner question to revision tracking'
);
select throws_ok(
  $$select public.create_practice_set('Forged practice', array['31000000-0000-4000-8000-000000000001'::uuid])$$,
  'P0001',
  null,
  'outsider cannot create a practice set from another owner question'
);
select throws_ok(
  $$select public.record_practice_answer(
    (select id from public.practice_set_items where owner_id = '11000000-0000-4000-8000-000000000001' and position = 1),
    'incorrect',
    null
  )$$,
  'P0001',
  null,
  'outsider cannot change another owner practice outcome'
);
select throws_ok(
  $$select public.update_planned_weekly_study_session(
    (select id from public.weekly_study_sessions where title = 'Updated study fixture session'),
    date '2026-11-02',
    'Forged edit',
    60,
    null
  )$$,
  'P0001',
  null,
  'outsider cannot edit another owner calendar session'
);
select throws_ok(
  $$select public.delete_planned_weekly_study_session(
    (select id from public.weekly_study_sessions where title = 'Updated study fixture session')
  )$$,
  'P0001',
  null,
  'outsider cannot delete another owner calendar session'
);

select * from finish();
rollback;
