begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'intake-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'intake-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'intake-owner.pdf', 'application/pdf', 1024, 'ready'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'intake-unprocessed.pdf', 'application/pdf', 2048, 'queued');

insert into public.drive_connections (owner_id, encrypted_refresh_token, granted_scope)
values ('11000000-0000-4000-8000-000000000001', 'test-encrypted-token-fixture', 'https://www.googleapis.com/auth/drive.file');

insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values ('22000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 1, 'Fixture extracted text', 'pdf_text', 'complete');

insert into public.processing_jobs (id, owner_id, document_id, stage, status, idempotency_key)
values ('23000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'validate', 'queued', 'intake-owner:fixture:validate');

insert into public.questions (id, owner_id, document_id, document_page_id, question_text)
values ('24000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'Fixture intake question');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"intake-owner@example.test"}';

select is((select count(*)::integer from public.documents where id = '21000000-0000-4000-8000-000000000001'), 1, 'document owner can read their archived document');
select is((select count(*)::integer from public.drive_connections), 1, 'document owner can read their Drive connection');
select is((select count(*)::integer from public.document_pages), 1, 'document owner can read extracted pages');
select is((select count(*)::integer from public.processing_jobs), 1, 'document owner can read processing jobs');
select is((select count(*)::integer from public.questions), 1, 'document owner can read linked questions');

select throws_ok(
  $sql$select public.replace_document_pages(
    '21000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '["replacement text"]'::jsonb
  )$sql$,
  'P0001', null,
  'atomic page replacement refuses to remove pages referenced by saved questions'
);

select is(
  (select count(*)::integer from public.document_pages where document_id = '21000000-0000-4000-8000-000000000001'),
  1,
  'blocked replacement preserves the original extracted page'
);

select is(
  public.replace_document_pages(
    '21000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000001',
    '["replacement page one","replacement page two"]'::jsonb
  ),
  2,
  'atomic replacement inserts the complete new page set'
);

select is(
  (select page_count from public.documents where id = '21000000-0000-4000-8000-000000000002'),
  2,
  'atomic replacement updates the document page count'
);

select throws_ok(
  $sql$select public.replace_document_pages(
    '21000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000001',
    '["valid page",""]'::jsonb
  )$sql$,
  'P0001', null,
  'atomic replacement rejects empty extracted page text'
);

select is(
  (select count(*)::integer from public.document_pages where document_id = '21000000-0000-4000-8000-000000000002'),
  2,
  'failed replacement rolls back and preserves the prior complete page set'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"intake-other@example.test"}';

select is((select count(*)::integer from public.documents), 0, 'another account cannot read documents');
select is((select count(*)::integer from public.drive_connections), 0, 'another account cannot read Drive refresh-token records');
select is((select count(*)::integer from public.document_pages), 0, 'another account cannot read extracted pages');
select is((select count(*)::integer from public.processing_jobs), 0, 'another account cannot read processing jobs');
select is((select count(*)::integer from public.questions), 0, 'another account cannot read linked questions');

select throws_ok(
  $sql$select public.replace_document_pages(
    '21000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000001',
    '["forged page"]'::jsonb
  )$sql$,
  '42501', null,
  'another account cannot replace pages for a different owner'
);

select throws_ok(
  $$insert into public.documents (owner_id, file_name, mime_type, file_size_bytes)
    values ('11000000-0000-4000-8000-000000000001', 'forged.pdf', 'application/pdf', 100)$$,
  '42501', null, 'another account cannot insert a document for the owner'
);

select throws_ok(
  $$insert into public.drive_connections (owner_id, encrypted_refresh_token, granted_scope)
    values ('11000000-0000-4000-8000-000000000001', 'forged-token', 'https://www.googleapis.com/auth/drive.file')$$,
  '42501', null, 'another account cannot insert or replace the owner Drive connection'
);

select throws_ok(
  $$insert into public.document_pages (owner_id, document_id, page_number, extracted_text, extraction_method)
    values ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 2, 'forged page', 'manual')$$,
  '42501', null, 'another account cannot add pages to the owner document'
);

select throws_ok(
  $$insert into public.processing_jobs (owner_id, document_id, stage, status, idempotency_key)
    values ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'validate', 'queued', 'forged-job')$$,
  '42501', null, 'another account cannot enqueue processing for the owner document'
);

select throws_ok(
  $$insert into public.questions (owner_id, document_id, document_page_id, question_text)
    values ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'forged question')$$,
  '42501', null, 'another account cannot add questions to the owner document'
);

update public.documents
set file_name = 'tampered.pdf'
where id = '21000000-0000-4000-8000-000000000001';

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"intake-owner@example.test"}';

select is(
  (select file_name from public.documents where id = '21000000-0000-4000-8000-000000000001'),
  'intake-owner.pdf',
  'another account cannot update the owner document'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"intake-other@example.test"}';

delete from public.document_pages
where id = '22000000-0000-4000-8000-000000000001';

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","email":"intake-owner@example.test"}';

select is(
  (select count(*)::integer from public.document_pages
   where id = '22000000-0000-4000-8000-000000000001'),
  1,
  'another account cannot delete the owner extracted page'
);

select throws_ok(
  $delete from public.document_pages where id = '22000000-0000-4000-8000-000000000001'$,
  '23503', null,
  'database foreign key prevents deleting a page referenced by a saved question'
);

select is(
  (select count(*)::integer from public.questions
   where id = '24000000-0000-4000-8000-000000000001'),
  1,
  'attempted page deletion cannot cascade-delete the saved question'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","email":"intake-other@example.test"}';

select throws_ok(
  $$insert into public.documents (owner_id, file_name, mime_type, file_size_bytes)
    values ('11000000-0000-4000-8000-000000000001', 'other-owner.pdf', 'application/pdf', 100)$$,
  '42501', null, 'authenticated account cannot set another owner_id on a new document'
);

select * from finish();
rollback;
