begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('13000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'worker-queue@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status, created_at)
values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'exhausted-failed.pdf', 'application/pdf', 1024, 'failed', now() - interval '60 minutes'),
  ('23000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', 'retryable-failed.pdf', 'application/pdf', 1024, 'failed', now() - interval '50 minutes'),
  ('23000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', 'queued.pdf', 'application/pdf', 1024, 'queued', now() - interval '40 minutes'),
  ('23000000-0000-4000-8000-000000000004', '13000000-0000-4000-8000-000000000001', 'stale-running.pdf', 'application/pdf', 1024, 'processing', now() - interval '30 minutes'),
  ('23000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000001', 'fresh-running.pdf', 'application/pdf', 1024, 'processing', now() - interval '20 minutes');

-- More than one worker page of terminal failures must not hide new work.
insert into public.documents (id, owner_id, file_name, mime_type, file_size_bytes, status, created_at)
select
  ('23000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '13000000-0000-4000-8000-000000000001',
  'exhausted-' || n || '.pdf',
  'application/pdf',
  1024,
  'failed',
  now() - interval '70 minutes' + n * interval '1 second'
from generate_series(10, 19) as n;

insert into public.processing_jobs (
  id, owner_id, document_id, stage, status, attempt_count, max_attempts,
  idempotency_key, started_at, created_at
)
values
  ('33000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'ocr', 'failed', 3, 3, 'worker-queue-exhausted', null, now() - interval '60 minutes'),
  ('33000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', 'ocr', 'failed', 1, 3, 'worker-queue-retryable', null, now() - interval '50 minutes'),
  ('33000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000003', 'ocr', 'queued', 0, 3, 'worker-queue-queued', null, now() - interval '40 minutes'),
  ('33000000-0000-4000-8000-000000000004', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000004', 'ocr', 'running', 3, 3, 'worker-queue-stale-running', now() - interval '30 minutes', now() - interval '30 minutes'),
  ('33000000-0000-4000-8000-000000000005', '13000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000005', 'ocr', 'running', 1, 3, 'worker-queue-fresh-running', now() - interval '5 minutes', now() - interval '20 minutes');
insert into public.processing_jobs (
  id, owner_id, document_id, stage, status, attempt_count, max_attempts,
  idempotency_key, started_at, created_at
)
select
  ('33000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '13000000-0000-4000-8000-000000000001',
  ('23000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'ocr',
  'failed',
  3,
  3,
  'worker-queue-exhausted-' || n,
  null,
  now() - interval '70 minutes' + n * interval '1 second'
from generate_series(10, 19) as n;

set local role service_role;

select is(
  (select count(*)::integer from public.list_claimable_document_jobs(now() - interval '15 minutes', 10)),
  3,
  'worker queue returns only retryable failed, queued and stale running jobs'
);

select ok(
  exists(select 1 from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) where id = '33000000-0000-4000-8000-000000000002'),
  'retryable failed jobs remain eligible for retry'
);

select ok(
  exists(select 1 from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) where id = '33000000-0000-4000-8000-000000000003'),
  'queued jobs remain eligible'
);

select ok(
  exists(select 1 from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) where id = '33000000-0000-4000-8000-000000000004'),
  'stale running jobs remain eligible for terminalization or recovery'
);

select ok(
  not exists(select 1 from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) where id = '33000000-0000-4000-8000-000000000001'),
  'exhausted failed jobs are excluded so they cannot starve the queue'
);

select ok(
  not exists(select 1 from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) where id = '33000000-0000-4000-8000-000000000005'),
  'fresh running jobs are not claimed twice'
);

select is(
  (select array_agg(jobs.status order by source.created_at)::text
   from public.list_claimable_document_jobs(now() - interval '15 minutes', 10) as jobs
   join public.processing_jobs as source on source.id = jobs.id),
  '{failed,queued,running}',
  'eligible jobs are returned oldest first'
);

select is(
  (select count(*)::integer from public.list_claimable_document_jobs(now() - interval '15 minutes', 1)),
  1,
  'worker candidate query respects its bounded result limit'
);

select throws_ok(
  $$select * from public.list_claimable_document_jobs(now(), 0)$$,
  'P0001',
  'Document worker candidate query parameters are invalid',
  'worker candidate query rejects an invalid result limit'
);

reset role;
set local role authenticated;
select throws_ok(
  $$select * from public.list_claimable_document_jobs(now(), 10)$$,
  '42501',
  'A trusted worker role is required',
  'authenticated users cannot enumerate worker queue candidates'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.list_claimable_document_jobs(now(), 10)$$,
  '42501',
  'A trusted worker role is required',
  'anonymous users cannot enumerate worker queue candidates'
);

select * from finish();
rollback;
