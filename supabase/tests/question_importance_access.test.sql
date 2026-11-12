begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('a1000000-0000-4000-8000-000000000001','authenticated','authenticated','importance-owner@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
 ('a1000000-0000-4000-8000-000000000002','authenticated','authenticated','importance-teacher@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
 ('a1000000-0000-4000-8000-000000000003','authenticated','authenticated','importance-outsider@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','importance.pdf','application/pdf',100);
insert into public.questions (id, owner_id, document_id, question_text, review_status)
values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Important fixture question','approved'),
 ('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Unapproved fixture question','needs_review');
insert into public.question_teacher_invites (id, question_id, owner_id, invited_email, accepted_by, accepted_at)
values ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','importance-teacher@example.test','a1000000-0000-4000-8000-000000000002',now());

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","email":"importance-owner@example.test"}';
select lives_ok($$insert into public.question_importance(owner_id,question_id,importance_level,rationale,marked_by) values ('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','core','Teacher-selected core topic','a1000000-0000-4000-8000-000000000001')$$,'owner can curate an approved question');
select is((select count(*)::int from public.question_importance),1,'owner can read own priority');
select lives_ok($$update public.question_importance set rationale = 'Owner-updated rationale' where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'owner can update their own priority');
select is(
  (select rationale from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'),
  'Owner-updated rationale',
  'owner priority update is persisted'
);
select throws_ok($$insert into public.question_importance(owner_id,question_id,importance_level,marked_by) values ('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','high','a1000000-0000-4000-8000-000000000001')$$,'42501',null,'owner cannot mark an unapproved question as important through the database API');
select throws_ok($$update public.question_importance set question_id='a3000000-0000-4000-8000-000000000002'$$,'42501',null,'owner cannot retarget a priority to an unapproved question');
select throws_ok($$update public.question_importance set marked_by='a1000000-0000-4000-8000-000000000002'$$,'42501',null,'owner cannot forge another curator identity');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","email":"importance-teacher@example.test"}';
select is((select count(*)::int from public.question_importance),1,'accepted question teacher can read the priority');
select lives_ok($$update public.question_importance set rationale = 'Teacher-forged rationale' where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'accepted teacher update is filtered by row-level security');
select is(
  (select rationale from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'),
  'Owner-updated rationale',
  'teacher update leaves owner priority unchanged'
);
select lives_ok($$delete from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'accepted teacher delete is filtered by row-level security');
select is(
  (select count(*)::int from public.question_importance),
  1,
  'owner priority remains after teacher mutation attempts'
);
select throws_ok($$insert into public.question_importance(owner_id,question_id,importance_level,marked_by) values ('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','high','a1000000-0000-4000-8000-000000000002')$$,'42501',null,'shared teacher cannot alter owner-curated importance');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","email":"importance-outsider@example.test"}';
select is((select count(*)::int from public.question_importance),0,'unrelated account cannot read another owner priority');
select throws_ok($$insert into public.question_importance(owner_id,question_id,importance_level,marked_by) values ('a1000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','high','a1000000-0000-4000-8000-000000000003')$$,'42501',null,'unrelated account cannot create priority on another owner question');
select lives_ok($$update public.question_importance set rationale = 'Outsider-forged rationale' where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'unrelated account update is filtered by row-level security');
select lives_ok($$delete from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'unrelated account delete is filtered by row-level security');
select is(
  (select rationale from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'),
  'Owner-updated rationale',
  'owner priority remains unchanged after outsider mutation attempts'
);
reset role;

select ok(not has_table_privilege('anon','public.question_importance','select'),'anonymous role cannot read priorities');
select ok(not has_table_privilege('anon','public.question_importance','insert'),'anonymous role cannot create priorities');
select ok(has_table_privilege('authenticated','public.question_importance','select'),'authenticated role has select grant');
select ok(has_table_privilege('authenticated','public.question_importance','insert'),'authenticated role has insert grant');
select ok(has_table_privilege('authenticated','public.question_importance','delete'),'authenticated role has delete grant');

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","email":"importance-owner@example.test"}';
select lives_ok($$delete from public.question_importance where question_id = 'a3000000-0000-4000-8000-000000000001'$$,'owner can delete their own priority');
select is((select count(*)::int from public.question_importance),0,'owner deletion removes only the owned priority');
reset role;

select * from finish();
rollback;
