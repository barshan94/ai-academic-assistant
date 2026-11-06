begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('14000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'attempt-fence@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status)
values
  ('24000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'fenced-complete.pdf', 'application/pdf', 1024, 'processing'),
  ('24000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', 'fenced-failure.pdf', 'application/pdf', 1024, 'processing');

insert into public.processing_jobs (
  id, owner_id, document_id, stage, status, attempt_count, max_attempts, idempotency_key, started_at
)
values
  ('34000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'ocr', 'running', 2, 3, 'attempt-fence-complete', now()),
  ('34000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002', 'ocr', 'running', 2, 3, 'attempt-fence-failure', now());

set local role service_role;

select throws_ok(
  $$select public.complete_document_processing(
    '24000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000001',
    1,
    '["old attempt output"]'::jsonb
  )$$,
  'P0001',
  'The processing attempt is stale or no longer running',
  'a reclaimed older attempt cannot replace document pages'
);

select is(
  public.complete_document_processing(
    '24000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000001',
    2,
    '["current attempt output"]'::jsonb
  ),
  1,
  'the current attempt can atomically complete page replacement'
);

select throws_ok(
  $$select public.fail_document_processing(
    '24000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000002',
    1,
    'BACKGROUND_PROCESSING_FAILED'
  )$$,
  'P0001',
  'The processing attempt is stale or no longer running',
  'a reclaimed older attempt cannot fail the newer attempt'
);

select ok(
  public.fail_document_processing(
    '24000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000001',
    '34000000-0000-4000-8000-000000000002',
    2,
    'BACKGROUND_PROCESSING_FAILED'
  ),
  'the current attempt can atomically persist failure'
);

reset role;
select * from finish();
rollback;
