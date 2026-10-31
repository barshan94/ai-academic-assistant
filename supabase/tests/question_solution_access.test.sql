begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- Isolated identities and records. This test runs inside a transaction and rolls back.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-teacher@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rls-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'rls-fixture.pdf', 'application/pdf', 100);

insert into public.questions (id, owner_id, document_id, question_text, board, qualification, subject)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'RLS fixture question', 'Example Board', 'A Level', 'Physics');

insert into public.question_solutions (id, owner_id, question_id, provider, model, prompt_version, answer_json)
values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'test-provider', 'test-model', 'test-v1', '{}'::jsonb);

insert into public.question_solution_mark_schemes (id, solution_id, owner_id, title, awarding_body, qualification, subject, source_url, points)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'RLS fixture scheme', 'Example Board', 'A Level', 'Physics', 'https://example.test/mark-scheme.pdf', '[{"id":"M1","description":"Fixture point","keyPhrases":["fixture"]}]'::jsonb);

insert into public.question_teacher_invites (id, question_id, owner_id, invited_email)
values ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'rls-teacher@example.test');

-- Owner sees their own mark scheme.
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-owner@example.test"}';
select throws_ok(
  $$select public.record_teacher_solution_review('40000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501',
  'Owner cannot submit an independent teacher review',
  'owner cannot promote their own answer to teacher-verified'
);
select is(
  (select count(*)::integer from public.question_solution_mark_schemes),
  1,
  'owner can read their saved mark scheme'
);

select throws_ok(
  $$update public.question_solution_mark_schemes
    set title = 'Mutated scheme'
    where id = '50000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'owner cannot update an append-only saved mark scheme'
);

select throws_ok(
  $$delete from public.question_solution_mark_schemes
    where id = '50000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'owner cannot delete an append-only saved mark scheme'
);

-- An unrelated authenticated account cannot read owner records or accept another user's invite.
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","email":"rls-outsider@example.test"}';
select throws_ok(
  $$select public.record_teacher_solution_review('40000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501',
  'An active accepted teacher invitation is required',
  'uninvited account cannot promote an answer to teacher-verified'
);
select is((select count(*)::integer from public.question_solutions), 0, 'uninvited account cannot read saved solutions');
select is((select count(*)::integer from public.question_solution_mark_schemes), 0, 'uninvited account cannot read mark schemes');
select is((select count(*)::integer from public.question_teacher_invites), 0, 'uninvited account cannot read another user invite');

select throws_ok(
  $$insert into public.question_solution_mark_schemes (solution_id, owner_id, title, awarding_body, qualification, subject, source_url, points)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Forged scheme', 'Example Board', 'A Level', 'Physics', 'https://example.test/forged.pdf', '[]'::jsonb)$$,
  '42501',
  null,
  'uninvited account cannot insert a mark scheme for another owner'
);

select throws_ok(
  $$insert into public.question_solution_reviews (solution_id, owner_id, reviewer_id, decision, correction_notes)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'approved', null)$$,
  '42501',
  null,
  'uninvited account cannot add a review to another owner solution'
);

-- Invited teacher can see the invite and accept it using their authenticated identity.
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","email":"rls-teacher@example.test"}';
select is((select count(*)::integer from public.question_teacher_invites), 1, 'invited teacher can see their pending invite');
update public.question_teacher_invites
set accepted_by = '10000000-0000-4000-8000-000000000002',
    accepted_at = now()
where id = '60000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.questions), 1, 'accepted teacher can read the shared question');
select is((select count(*)::integer from public.question_solutions), 1, 'accepted teacher can read the shared solution');
select is((select count(*)::integer from public.question_solution_mark_schemes), 0, 'teacher cannot read owner-private mark scheme');

select throws_ok(
  $$insert into public.question_solution_mark_schemes (solution_id, owner_id, title, awarding_body, qualification, subject, source_url, points)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Teacher forged scheme', 'Example Board', 'A Level', 'Physics', 'https://example.test/teacher-forged.pdf', '[{"id":"M1","description":"Fixture point","keyPhrases":["fixture"]}]'::jsonb)$$,
  '42501',
  null,
  'accepted teacher cannot insert an owner-private mark scheme'
);

-- Teacher reviews use the authorized RPC. Direct table INSERT is no longer
-- available to teachers, so the verification label cannot be bypassed.
select lives_ok(
  $$select public.record_teacher_solution_review('40000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'accepted teacher can append an independent review through the authorized workflow'
);
select is(
  (select verification_status from public.question_solutions where id = '40000000-0000-4000-8000-000000000001'),
  'teacher_verified',
  'an approved active teacher review promotes the saved answer to teacher-verified'
);
select throws_ok(
  $$insert into public.question_solution_reviews (solution_id, owner_id, reviewer_id, decision, correction_notes)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'approved', null)$$,
  '42501',
  null,
  'teacher cannot bypass the authorized review RPC with direct table INSERT'
);
select throws_ok(
  $$update public.question_solutions
    set verification_status = 'teacher_verified'
    where id = '40000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'teacher cannot directly update the verification label'
);
select lives_ok(
  $$select public.record_teacher_solution_review('40000000-0000-4000-8000-000000000001', 'needs_correction', 'Please correct the intermediate working.')$$,
  'accepted teacher can append a correction review through the authorized workflow'
);
select is(
  (select verification_status from public.question_solutions where id = '40000000-0000-4000-8000-000000000001'),
  'generated',
  'a later correction review removes the teacher-verified label'
);

select throws_ok(
  $$insert into public.question_solution_reviews (solution_id, owner_id, reviewer_id, decision, correction_notes)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501',
  null,
  'teacher cannot impersonate the owner as reviewer'
);

-- Owner revokes access. Historical review remains visible to the owner, but the
-- former teacher loses current question/solution visibility and cannot add reviews.
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-owner@example.test"}';
select lives_ok(
  $$update public.question_teacher_invites
    set revoked_at = now()
    where id = '60000000-0000-4000-8000-000000000001'$$,
  'owner can revoke an accepted teacher invitation'
);
select is(
  (select count(*)::integer from public.question_solution_reviews),
  2,
  'owner retains the historical teacher reviews after revocation'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","email":"rls-teacher@example.test"}';
select is((select count(*)::integer from public.questions), 0, 'revoked teacher can no longer read the shared question');
select is((select count(*)::integer from public.question_solutions), 0, 'revoked teacher can no longer read the saved solution');
select throws_ok(
  $$select public.record_teacher_solution_review('40000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501',
  'An active accepted teacher invitation is required',
  'revoked teacher cannot submit an independent verification review'
);
select throws_ok(
  $$insert into public.question_solution_reviews (solution_id, owner_id, reviewer_id, decision, correction_notes)
    values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'approved', null)$$,
  '42501',
  null,
  'revoked teacher cannot append another solution review'
);

select * from finish();
rollback;
