begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reference-admin@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'reference-user@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- Platform-admin membership is provisioned out of band, never by an end user.
insert into public.platform_admins (user_id, created_by)
values ('71000000-0000-4000-8000-000000000001', null);

set local role authenticated;
set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","email":"reference-admin@example.test"}';

select ok((select public.is_platform_admin()), 'provisioned curator is recognized as a platform admin');
select lives_ok(
  $$insert into public.reference_syllabus_catalogs
    (board, qualification, subject, version, source_url, source_title, source_checked_at)
    values ('Example Board', 'A Level', 'Physics', '2026', 'https://example.test/physics', 'Official Physics specification', now())$$,
  'platform admin can create a draft shared catalogue'
);
select is(
  (select status from public.reference_syllabus_catalogs where board = 'Example Board' and qualification = 'A Level' and subject = 'Physics' and version = '2026'),
  'draft',
  'platform admin can read the draft catalogue they just created'
);
select lives_ok(
  $$insert into public.reference_syllabus_chapters (catalog_id, title, sort_order)
    values ((select id from public.reference_syllabus_catalogs where board = 'Example Board' and qualification = 'A Level' and subject = 'Physics' and version = '2026'), 'Mechanics', 1)$$,
  'platform admin can add a chapter to a draft catalogue'
);
select lives_ok(
  $$insert into public.reference_syllabus_topics (chapter_id, title, sort_order)
    values ((select id from public.reference_syllabus_chapters where catalog_id = (select id from public.reference_syllabus_catalogs where subject = 'Physics' and version = '2026') and title = 'Mechanics'), 'Newton laws', 1)$$,
  'platform admin can add a topic to a draft chapter'
);
select lives_ok(
  $$insert into public.reference_syllabus_evidence
    (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator, evidence_excerpt)
    values ('72000000-0000-4000-8000-000000000001', (select id from public.reference_syllabus_chapters where catalog_id = (select id from public.reference_syllabus_catalogs where subject = 'Physics' and version = '2026') and title = 'Mechanics'), null, 'https://example.test/physics', 'Official Physics specification', 'Section 2', 'Mechanics'),
           ('72000000-0000-4000-8000-000000000001', (select id from public.reference_syllabus_chapters where catalog_id = '72000000-0000-4000-8000-000000000001' and title = 'Mechanics'), (select id from public.reference_syllabus_topics where title = 'Newton laws'), 'https://example.test/physics', 'Official Physics specification', 'Section 2.1', 'Newton laws')$$,
  'platform admin can attach chapter and topic source evidence'
);
select lives_ok(
  $$update public.reference_syllabus_catalogs set status = 'verified'
    where id = '72000000-0000-4000-8000-000000000001'$$,
  'catalogue can be verified after chapter and topic evidence are recorded'
);
select is(
  (select verified_by from public.reference_syllabus_catalogs where id = '72000000-0000-4000-8000-000000000001'),
  '71000000-0000-4000-8000-000000000001'::uuid,
  'verification identity is set from the authenticated curator'
);

select lives_ok(
  $$insert into public.reference_syllabus_catalogs
    (board, qualification, subject, version)
    values ('Example Board', 'A Level', 'Chemistry', 'draft-1')$$,
  'platform admin can create a second draft catalogue'
);
select throws_ok(
  $$update public.reference_syllabus_catalogs set status = 'verified'
    where subject = 'Chemistry' and version = 'draft-1'$$,
  'P0001',
  'A verified catalogue requires a checked HTTPS source and source title',
  'catalogue without complete source provenance cannot be verified'
);

set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","email":"reference-user@example.test"}';

select ok(not (select public.is_platform_admin()), 'ordinary authenticated user is not a platform admin');
select is((select count(*)::integer from public.platform_admins), 0, 'ordinary user cannot read another curator membership');
select throws_ok(
  $$insert into public.platform_admins (user_id) values ('71000000-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'ordinary user cannot self-promote into platform admin'
);
select throws_ok(
  $$insert into public.reference_syllabus_catalogs (board, qualification, subject, version)
    values ('Forged Board', 'A Level', 'Biology', '1')$$,
  'P0001',
  'Only platform administrators can manage shared syllabus references',
  'ordinary user cannot create a shared reference catalogue'
);
select is((select count(*)::integer from public.reference_syllabus_catalogs), 1, 'ordinary user sees verified catalogues but not drafts');
select is((select count(*)::integer from public.reference_syllabus_chapters), 1, 'ordinary user can read chapters in verified catalogues');
select is((select count(*)::integer from public.reference_syllabus_topics), 1, 'ordinary user can read topics in verified catalogues');
select is((select count(*)::integer from public.reference_syllabus_evidence), 2, 'ordinary user can read evidence for verified catalogues');

set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","email":"reference-admin@example.test"}';
select throws_ok(
  $$update public.reference_syllabus_catalogs set source_title = 'Changed after verification'
    where id = '72000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'Verified catalogue identity and provenance are immutable; publish a new version',
  'verified catalogue provenance cannot be silently changed'
);

select * from finish();
rollback;
