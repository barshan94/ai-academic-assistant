begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('11000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'chapter-note-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.syllabus_catalogs (id, owner_id, board, qualification, subject, version)
values ('41000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', 'Example Board', 'O Level', 'Physics', '2026');
insert into public.syllabus_chapters (id, owner_id, catalog_id, title)
values
 ('42000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', '41000000-0000-4000-8000-000000000011', 'Forces'),
 ('42000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000011', '41000000-0000-4000-8000-000000000011', 'Energy');

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes)
values ('21000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', 'chapter-note-source.pdf', 'application/pdf', 100);
insert into public.questions (id, owner_id, document_id, question_text, board, qualification, subject, chapter, topic, review_status, syllabus_catalog_id, syllabus_chapter_id)
values
 ('31000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', 'Approved Forces question', 'Example Board', 'O Level', 'Physics', 'Forces', 'Motion', 'approved', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000011'),
 ('31000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', 'Unreviewed Forces question', 'Example Board', 'O Level', 'Physics', 'Forces', 'Motion', 'needs_review', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000011'),
 ('31000000-0000-4000-8000-000000000013', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', 'Approved Energy question', 'Example Board', 'O Level', 'Physics', 'Energy', 'Work', 'approved', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000012');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000011';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000011","role":"authenticated","email":"chapter-note-owner@example.test"}';

select lives_ok(
  $$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Valid Forces note',
    '{"summary":"Source-backed"}'::jsonb,
    array['31000000-0000-4000-8000-000000000011'::uuid],
    '{}'::uuid[],
    null
  )$$,
  'owner can create a note from an approved question classified to the selected chapter'
);
select throws_ok(
  $$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Unreviewed source note',
    '{"summary":"Must reject"}'::jsonb,
    array['31000000-0000-4000-8000-000000000012'::uuid],
    '{}'::uuid[],
    null
  )$$,
  'P0001',
  'Every question source must be approved and classified to this chapter',
  'owner cannot attach an unreviewed question to a chapter note'
);
select throws_ok(
  $$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Wrong chapter source note',
    '{"summary":"Must reject"}'::jsonb,
    array['31000000-0000-4000-8000-000000000013'::uuid],
    '{}'::uuid[],
    null
  )$$,
  'P0001',
  'Every question source must be approved and classified to this chapter',
  'owner cannot attach an approved question classified to a different chapter'
);

select * from finish();
rollback;
