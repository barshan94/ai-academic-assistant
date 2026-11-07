begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('72000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'syllabus-lifecycle-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;
set local request.jwt.claim.sub = '72000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated","email":"syllabus-lifecycle-owner@example.test"}';

select lives_ok(
  $$insert into public.syllabus_catalogs
    (owner_id, board, qualification, subject, version, source_url, source_title)
    values ('72000000-0000-4000-8000-000000000001', 'Example Board', 'A Level', 'Mathematics', '2026', 'https://example.test/math', 'Official Mathematics specification')$$,
  'owner can create a private syllabus catalogue as a draft'
);

select lives_ok(
  $$insert into public.syllabus_chapters (owner_id, catalog_id, title, sort_order)
    select '72000000-0000-4000-8000-000000000001', id, 'Algebra', 1
    from public.syllabus_catalogs where subject = 'Mathematics' and version = '2026'$$,
  'owner can add a chapter while the catalogue is draft'
);

select lives_ok(
  $$update public.syllabus_catalogs set status = 'verified'
    where subject = 'Mathematics' and version = '2026'$$,
  'catalogue can be verified after source provenance and a chapter are present'
);

select ok(
  (select source_checked_at is not null from public.syllabus_catalogs
   where subject = 'Mathematics' and version = '2026'),
  'database generates the source-check timestamp during verification'
);

select throws_ok(
  $$insert into public.syllabus_chapters (owner_id, catalog_id, title, sort_order)
    select '72000000-0000-4000-8000-000000000001', id, 'Calculus', 2
    from public.syllabus_catalogs where subject = 'Mathematics' and version = '2026'$$,
  'P0001',
  'Syllabus taxonomy can only be changed while its catalog is in draft status',
  'verified catalogue taxonomy is frozen'
);

select throws_ok(
  $$update public.syllabus_catalogs set status = 'draft'
    where subject = 'Mathematics' and version = '2026'$$,
  '23514',
  'A verified syllabus catalogue can only remain verified or be retired',
  'verified catalogue cannot regress to draft'
);

select lives_ok(
  $$update public.syllabus_catalogs set status = 'retired'
    where subject = 'Mathematics' and version = '2026'$$,
  'verified catalogue can be retired'
);

select throws_ok(
  $$update public.syllabus_catalogs set subject = 'Changed Mathematics'
    where subject = 'Mathematics' and version = '2026'$$,
  '42501',
  'permission denied for table syllabus_catalogs',
  'retired catalogue metadata cannot be changed because authenticated users have no metadata-update grant'
);

select * from finish();
rollback;
