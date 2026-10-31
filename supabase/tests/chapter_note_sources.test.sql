begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('11000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'chapter-note-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('11000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'chapter-note-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

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

insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values
 ('22000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', 1, 'Forces source page', 'pdf_text', 'complete'),
 ('22000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', 2, 'Energy source page', 'pdf_text', 'complete');
insert into public.questions (id, owner_id, document_id, document_page_id, question_text, board, qualification, subject, chapter, topic, review_status, syllabus_catalog_id, syllabus_chapter_id)
values
 ('31000000-0000-4000-8000-000000000014', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000011', 'Approved Forces page question', 'Example Board', 'O Level', 'Physics', 'Forces', 'Motion', 'approved', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000011'),
 ('31000000-0000-4000-8000-000000000015', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000012', 'Approved Energy page question', 'Example Board', 'O Level', 'Physics', 'Energy', 'Work', 'approved', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000012'),
 ('31000000-0000-4000-8000-000000000016', '11000000-0000-4000-8000-000000000011', '21000000-0000-4000-8000-000000000011', '22000000-0000-4000-8000-000000000011', 'Approved Energy question on shared page', 'Example Board', 'O Level', 'Physics', 'Energy', 'Work', 'approved', '41000000-0000-4000-8000-000000000011', '42000000-0000-4000-8000-000000000012');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000011';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000011","role":"authenticated","email":"chapter-note-owner@example.test"}';

select lives_ok(
  $$$select public.create_chapter_note_draft(
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
  $$$select public.create_chapter_note_draft(
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
update public.questions
set review_status = 'needs_review'
where id = '31000000-0000-4000-8000-000000000011';

select throws_ok(
  $$$update public.chapter_note_versions
    set status = 'approved'
    where title = 'Valid Forces note'$$,
  'P0001',
  'Every question source must remain approved and classified to this chapter',
  'approval is blocked if a linked question is no longer approved'
);

select throws_ok(
  $$$select public.create_chapter_note_draft(
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


select lives_ok(
  $$$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Valid page-source note',
    '{"summary":"Page-backed"}'::jsonb,
    '{}'::uuid[],
    array['22000000-0000-4000-8000-000000000011'::uuid],
    null
  )$$,
  'owner can create a note with a page linked to an approved question in the selected chapter'
);
select lives_ok(
  $$$update public.chapter_note_versions
    set status = 'approved'
    where title = 'Valid page-source note'$$,
  'a page source linked to an approved question in the same chapter can be approved'
);
select lives_ok(
  $$$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Wrong chapter page-source note',
    '{"summary":"Must not approve"}'::jsonb,
    '{}'::uuid[],
    array['22000000-0000-4000-8000-000000000012'::uuid],
    null
  )$$,
  'draft creation preserves an owned page as a draft source before approval checks'
);
select throws_ok(
  $$$update public.chapter_note_versions
    set status = 'approved'
    where title = 'Wrong chapter page-source note'$$,
  'P0001',
  'Every document page source must remain linked to an approved question in this chapter',
  'approval is blocked when a page belongs to a question classified to another chapter'
);

-- Note content and source history are immutable after creation.
select throws_ok(
  $$update public.chapter_note_versions
    set title = 'Tampered title'
    where title = 'Valid page-source note'$,
  'P0001',
  'Chapter note content is immutable; create a new version instead',
  'owner cannot edit an existing chapter note instead of creating a revision'
);
select throws_ok(
  $$update public.chapter_note_sources
    set locator = 'tampered locator'
    where note_version_id = (
      select id from public.chapter_note_versions where title = 'Valid page-source note'
    )$,
  'P0001',
  'Chapter note source history is append-only',
  'owner cannot edit an existing chapter note source reference'
);
select throws_ok(
  $$delete from public.chapter_note_sources
    where note_version_id = (
      select id from public.chapter_note_versions where title = 'Valid page-source note'
    )$,
  'P0001',
  'Chapter note source history is append-only',
  'owner cannot delete an existing chapter note source reference'
);
insert into public.chapter_note_versions (
  owner_id, catalog_id, chapter_id, version_number, title, content_json, status
) values (
  '11000000-0000-4000-8000-000000000011',
  '41000000-0000-4000-8000-000000000011',
  '42000000-0000-4000-8000-000000000011',
  4,
  'No source note',
  '{"summary":"No source attached"}'::jsonb,
  'draft'
);
select throws_ok(
  $$update public.chapter_note_versions
    set status = 'approved'
    where title = 'No source note'$,
  'P0001',
  'A chapter note needs at least one source before approval',
  'owner cannot approve a chapter note without a source reference'
);

-- Switch to a second authenticated account and prove that note data and
-- chapter-scoped draft creation remain isolated at the database boundary.
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000012';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000012","role":"authenticated","email":"chapter-note-other@example.test"}';

select is(
  (select count(*) from public.chapter_note_versions),
  0::bigint,
  'a second account cannot read another owner chapter-note versions'
);
select is(
  (select count(*) from public.chapter_note_sources),
  0::bigint,
  'a second account cannot read another owner chapter-note source history'
);
select throws_ok(
  $$$select public.create_chapter_note_draft(
    '41000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000011',
    'Cross-owner note attempt',
    '{"summary":"Must reject"}'::jsonb,
    array['31000000-0000-4000-8000-000000000011'::uuid],
    '{}'::uuid[],
    null
  )$$,
  'P0001',
  'Chapter does not belong to this account and syllabus',
  'a second account cannot create a note in another owner chapter'
);

select * from finish();
rollback;
