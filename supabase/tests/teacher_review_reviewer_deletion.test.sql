begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('12000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'review-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('12000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'review-teacher@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'review-delete-fixture.pdf', 'application/pdf', 100);

insert into public.questions (id, owner_id, document_id, question_text)
values ('32000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'Reviewer deletion fixture');

insert into public.question_solutions (
  id, owner_id, question_id, provider, model, prompt_version, answer_json
) values (
  '42000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001',
  'test-provider', 'test-model', 'test-v1', '{}'::jsonb
);

insert into public.question_teacher_invites (
  id, question_id, owner_id, invited_email, accepted_by, accepted_at
) values (
  '62000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  'review-teacher@example.test',
  '12000000-0000-4000-8000-000000000002',
  now()
);

set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated","email":"review-teacher@example.test"}';

select lives_ok(
  $$select public.record_teacher_solution_review('42000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'accepted teacher can verify the answer before account deletion'
);
select is(
  (select verification_status from public.question_solutions where id = '42000000-0000-4000-8000-000000000001'),
  'teacher_verified',
  'approved teacher review sets teacher_verified'
);

reset role;
delete from auth.users where id = '12000000-0000-4000-8000-000000000002';

select is(
  (select count(*)::integer from public.question_solution_reviews where solution_id = '42000000-0000-4000-8000-000000000001'),
  0,
  'review rows cascade when the reviewer account is deleted'
);
select is(
  (select verification_status from public.question_solutions where id = '42000000-0000-4000-8000-000000000001'),
  'generated',
  'teacher verification is withdrawn when no surviving teacher review remains'
);

select * from finish();
rollback;
