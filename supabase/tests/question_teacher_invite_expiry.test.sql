begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'invite-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'invite-teacher@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'invite-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'invite-fixture.pdf', 'application/pdf', 100);

insert into public.questions (id, owner_id, document_id, question_text)
values ('31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Teacher invite expiry fixture');

-- Owner creates an invitation. The database, not client input, chooses the
-- seven-day expiry and serializes duplicate creation.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"invite-owner@example.test"}';

select ok(
  public.create_question_teacher_invite('31000000-0000-4000-8000-000000000001', 'INVITE-TEACHER@example.test') is not null,
  'owner can create a normalized teacher invitation'
);
select ok(
  (select expires_at > now() and expires_at <= now() + interval '8 days'
   from public.question_teacher_invites
   where question_id = '31000000-0000-4000-8000-000000000001'
     and invited_email = 'invite-teacher@example.test'
     and accepted_by is null and revoked_at is null),
  'new pending invitations receive a bounded seven-day acceptance window'
);
select throws_ok(
  $test$select public.create_question_teacher_invite('31000000-0000-4000-8000-000000000001', 'invite-teacher@example.test')$test$,
  '23505',
  'An active invitation already exists',
  'duplicate pending invitation is rejected atomically'
);

-- A different signed-in account cannot accept an invitation addressed to the
-- teacher, even if it knows the invitation UUID.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated","email":"invite-outsider@example.test"}';
select throws_ok(
  $test$select public.accept_question_teacher_invite((select id from public.question_teacher_invites where invited_email = 'invite-teacher@example.test' order by created_at desc limit 1))$test$,
  '42501',
  null,
  'invitation cannot be accepted by a different verified email'
);

-- The matching, verified account accepts exactly once.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"invite-teacher@example.test"}';
select lives_ok(
  $test$select public.accept_question_teacher_invite((select id from public.question_teacher_invites where invited_email = 'invite-teacher@example.test' order by created_at desc limit 1))$test$,
  'matching verified teacher can accept the invitation'
);
select is(
  (select count(*)::integer from public.questions),
  1,
  'accepted teacher receives access only to the shared question'
);

-- An accepted, unrevoked teacher is still active even after the pending invite
-- deadline passes; expiry only limits acceptance of pending invitations.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"invite-owner@example.test"}';
select throws_ok(
  $test$select public.create_question_teacher_invite('31000000-0000-4000-8000-000000000001', 'invite-teacher@example.test')$test$,
  '23505',
  'An active invitation already exists',
  'an accepted active invitation cannot be duplicated'
);
select lives_ok(
  $test$select public.revoke_question_teacher_invite((select id from public.question_teacher_invites where invited_email = 'invite-teacher@example.test' and accepted_by = '11000000-0000-4000-8000-000000000002' order by created_at desc limit 1))$test$,
  'owner can revoke an accepted invitation once through the atomic RPC'
);

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"invite-teacher@example.test"}';
select is((select count(*)::integer from public.questions), 0, 'revoked teacher immediately loses question access');
select throws_ok(
  $test$select public.accept_question_teacher_invite((select id from public.question_teacher_invites where invited_email = 'invite-teacher@example.test' order by created_at desc limit 1))$test$,
  '42501',
  null,
  'revoked invitation cannot be accepted again');

-- Expired pending rows remain in history but do not block a new invitation.
set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"invite-owner@example.test"}';
select ok(
  public.create_question_teacher_invite('31000000-0000-4000-8000-000000000001', 'invite-outsider@example.test') is not null,
  'owner can create an invitation for a second teacher'
);

reset role;
update public.question_teacher_invites
set created_at = now() - interval '9 days',
    expires_at = now() - interval '2 days'
where question_id = '31000000-0000-4000-8000-000000000001'
  and invited_email = 'invite-outsider@example.test'
  and accepted_by is null and revoked_at is null;

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated","email":"invite-outsider@example.test"}';
select throws_ok(
  $select public.accept_question_teacher_invite((select id from public.question_teacher_invites where invited_email = 'invite-outsider@example.test' order by created_at desc limit 1))$,
  '42501',
  null,
  'expired pending invitation cannot be accepted'
);

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"invite-owner@example.test"}';
select ok(
  public.create_question_teacher_invite('31000000-0000-4000-8000-000000000001', 'invite-outsider@example.test') is not null,
  'expired pending invitation does not block a fresh invitation'
);

select * from finish();
rollback;
