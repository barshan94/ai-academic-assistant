begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('12000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'atomic-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('12000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'atomic-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- Approval fixtures cover success, page-count mismatch, and a forced page-update
-- failure to prove that page and parent state changes roll back together.
insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, page_count, status)
values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'approve-success.pdf', 'application/pdf', 1024, 2, 'review_required'),
  ('22000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', 'approve-mismatch.pdf', 'application/pdf', 1024, 3, 'review_required'),
  ('22000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', 'approve-failure.pdf', 'application/pdf', 1024, 2, 'review_required');

insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values
  ('32000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 1, 'Approval fixture page one', 'manual', 'review_required'),
  ('32000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 2, 'Approval fixture page two', 'manual', 'review_required'),
  ('32000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002', 1, 'Mismatch fixture page one', 'manual', 'review_required'),
  ('32000000-0000-4000-8000-000000000004', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002', 2, 'Mismatch fixture page two', 'manual', 'review_required'),
  ('32000000-0000-4000-8000-000000000005', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000003', 1, 'Failure fixture page one', 'manual', 'review_required'),
  ('32000000-0000-4000-8000-000000000006', '12000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000003', 2, 'Failure fixture page two', 'manual', 'review_required');

-- Inject a failure in the processing-job insert after the document row has been
-- inserted. The registration RPC must roll the document insert back as well.
create function public.test_reject_atomic_processing_job()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.idempotency_key = '12000000-0000-4000-8000-000000000001:' || repeat('f', 64) || ':validate' then
    raise exception 'fixture forced processing job insert failure';
  end if;
  return new;
end;
$$;

create trigger test_reject_atomic_processing_job
before insert on public.processing_jobs
for each row execute function public.test_reject_atomic_processing_job();

-- Inject a failure while approving the second page. The whole approval RPC
-- must leave both page rows and the parent document in review_required.
create function public.test_reject_atomic_page_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id = '32000000-0000-4000-8000-000000000006'::uuid and new.status = 'complete' then
    raise exception 'fixture forced page approval failure';
  end if;
  return new;
end;
$$;

create trigger test_reject_atomic_page_approval
before update on public.document_pages
for each row execute function public.test_reject_atomic_page_approval();

-- The completed-upload registration RPC is server-only.
set local role service_role;

select is(
  (select count(*)::integer from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'atomic-upload.pdf',
    2048,
    repeat('a', 64),
    'drive-atomic-original',
    'https://drive.google.com/file/d/atomic-original/view',
    2
  )),
  1,
  'service role registers a document'
);

select is(
  (select count(*)::integer
   from public.processing_jobs j
   join public.documents d on d.id = j.document_id
   where d.owner_id = '12000000-0000-4000-8000-000000000001'
     and d.sha256 = repeat('a', 64)),
  1,
  'first registration creates its processing job in the same transaction'
);

select is(
  (select duplicate from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'renamed-copy.pdf',
    2048,
    repeat('a', 64),
    'drive-duplicate',
    null,
    2
  )),
  true,
  'same-owner same-content registration is reported as a duplicate'
);

select is(
  (select stored_drive_file_id from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'renamed-copy.pdf',
    2048,
    repeat('a', 64),
    'drive-duplicate',
    null,
    2
  )),
  'drive-atomic-original',
  'duplicate registration preserves the original Drive file reference'
);

select is(
  (select count(*)::integer from public.documents
   where owner_id = '12000000-0000-4000-8000-000000000001'
     and sha256 = repeat('a', 64)),
  1,
  'duplicate registration does not create another document row'
);

select is(
  (select duplicate from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000002',
    'other-owner-same-content.pdf',
    2048,
    repeat('a', 64),
    'drive-other-owner',
    null,
    2
  )),
  false,
  'the same content hash can be registered independently by another owner'
);

select is(
  (select count(*)::integer from public.documents where sha256 = repeat('a', 64)),
  2,
  'content deduplication is scoped to the owner'
);

select is(
  (select count(*)::integer
   from public.processing_jobs j
   join public.documents d on d.id = j.document_id
   where d.sha256 = repeat('a', 64)),
  2,
  'each independent owner registration receives its own processing job'
);

select throws_ok(
  $$select * from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'invalid-hash.pdf',
    1024,
    repeat('z', 64),
    'drive-invalid',
    null,
    1
  )$$,
  'P0001',
  'Uploaded document metadata is invalid',
  'registration rejects malformed content hashes'
);

select throws_ok(
  $$select * from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'rollback-upload.pdf',
    1024,
    repeat('f', 64),
    'drive-rollback',
    null,
    1
  )$$,
  'P0001',
  'fixture forced processing job insert failure',
  'processing-job insert failure aborts document registration'
);

select is(
  (select count(*)::integer from public.documents
   where owner_id = '12000000-0000-4000-8000-000000000001'
     and sha256 = repeat('f', 64)),
  0,
  'failed job creation leaves no orphaned document row'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","email":"atomic-owner@example.test"}';

select throws_ok(
  $$select * from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'browser-forged.pdf',
    1024,
    repeat('b', 64),
    'drive-forged',
    null,
    1
  )$$,
  '42501',
  null,
  'authenticated browser role cannot execute the server-only registration RPC'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.register_uploaded_document(
    '12000000-0000-4000-8000-000000000001',
    'anonymous-forged.pdf',
    1024,
    repeat('c', 64),
    'drive-anonymous',
    null,
    1
  )$$,
  '42501',
  null,
  'anonymous role cannot execute the server-only registration RPC'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","email":"atomic-owner@example.test"}';

select is(
  public.approve_document_review(
    '22000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000001'
  ),
  2,
  'owner approval returns the complete number of approved pages'
);

select is(
  (select status from public.documents where id = '22000000-0000-4000-8000-000000000001'),
  'ready',
  'successful approval marks the parent document ready'
);

select is(
  (select count(*)::integer from public.document_pages
   where document_id = '22000000-0000-4000-8000-000000000001'
     and status = 'complete'),
  2,
  'successful approval marks every page complete'
);

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated","email":"atomic-other@example.test"}';

select throws_ok(
  $$select public.approve_document_review(
    '22000000-0000-4000-8000-000000000002',
    '12000000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  'Document owner does not match the authenticated user',
  'another account cannot approve the document'
);

-- Restore the owner's JWT before asserting the owner-private row is unchanged.
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","email":"atomic-owner@example.test"}';

select is(
  (select status from public.documents where id = '22000000-0000-4000-8000-000000000002'),
  'review_required',
  'unauthorized approval leaves the document unchanged'
);

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","email":"atomic-owner@example.test"}';

select throws_ok(
  $$select public.approve_document_review(
    '22000000-0000-4000-8000-000000000002',
    '12000000-0000-4000-8000-000000000001'
  )$$,
  'P0001',
  'The document page count is inconsistent and cannot be approved',
  'approval rejects a parent page count that differs from the actual page set'
);

select is(
  (select status from public.documents where id = '22000000-0000-4000-8000-000000000002'),
  'review_required',
  'page-count mismatch leaves the parent document in review_required'
);

select is(
  (select count(*)::integer from public.document_pages
   where document_id = '22000000-0000-4000-8000-000000000002'
     and status = 'review_required'),
  2,
  'page-count mismatch leaves every page unchanged'
);

select throws_ok(
  $$select public.approve_document_review(
    '22000000-0000-4000-8000-000000000003',
    '12000000-0000-4000-8000-000000000001'
  )$$,
  'P0001',
  'fixture forced page approval failure',
  'a page-update failure aborts the entire approval transaction'
);

select is(
  (select status from public.documents where id = '22000000-0000-4000-8000-000000000003'),
  'review_required',
  'failed page update leaves the parent document unchanged'
);

select is(
  (select count(*)::integer from public.document_pages
   where document_id = '22000000-0000-4000-8000-000000000003'
     and status = 'review_required'),
  2,
  'failed page update rolls back all page status changes'
);

select * from finish();
rollback;
