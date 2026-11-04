begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('13000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reviewed-source-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('13000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'reviewed-source-other@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, page_count, status)
values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'reviewed.pdf', 'application/pdf', 1024, 1, 'ready'),
  ('23000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', 'pending-review.pdf', 'application/pdf', 1024, 1, 'review_required');

insert into public.document_pages (id, owner_id, document_id, page_number, extracted_text, extraction_method, status)
values
  ('33000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 1, 'Verified source page', 'manual', 'complete'),
  ('33000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', 1, 'Unreviewed source page', 'pdf_text', 'review_required');

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated","email":"reviewed-source-owner@example.test"}';

select ok(
  public.create_question_from_reviewed_page(
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    'Explain the verified principle.'
  ) is not null,
  'owner can create a question from a reviewed, complete page'
);

select is(
  (select review_status from public.questions
   where document_id = '23000000-0000-4000-8000-000000000001'),
  'needs_review',
  'newly captured questions still require their own review'
);

select throws_ok(
  $$insert into public.questions (owner_id, document_id, document_page_id, question_text)
    values (
      '13000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000002',
      '33000000-0000-4000-8000-000000000002',
      'Attempt to bypass document review'
    )$$,
  '42501', null,
  'direct question inserts cannot bypass document and page review'
);

select throws_ok(
  $$select public.create_question_from_reviewed_page(
    '23000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000002',
    '13000000-0000-4000-8000-000000000001',
    'Question from unreviewed source'
  )$$,
  'P0001',
  'The source document must be reviewed before creating questions',
  'atomic question RPC rejects a document awaiting human review'
);

select throws_ok(
  $$select public.create_question_from_reviewed_page(
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000002',
    '13000000-0000-4000-8000-000000000001',
    'Question with mismatched page'
  )$$,
  '42501',
  'The selected page does not belong to this document',
  'atomic question RPC rejects a page from another document'
);

select throws_ok(
  $$select public.create_question_from_reviewed_page(
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000002',
    'Question with forged owner'
  )$$,
  '42501',
  'Question owner does not match the authenticated user',
  'atomic question RPC rejects a forged owner'
);

reset role;
set local role anon;

select throws_ok(
  $$select public.create_question_from_reviewed_page(
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    'Anonymous question'
  )$$,
  '42501', null,
  'anonymous role cannot execute the reviewed-source question RPC'
);

select * from finish();
rollback;
