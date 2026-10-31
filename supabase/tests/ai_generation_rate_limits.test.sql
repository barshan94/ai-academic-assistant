begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11000000-0000-4000-8000-000000000021', 'authenticated', 'authenticated', 'quota-owner@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('11000000-0000-4000-8000-000000000022', 'authenticated', 'authenticated', 'quota-outsider@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000021';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000021","role":"authenticated","email":"quota-owner@example.test"}';

select is(public.consume_ai_generation_quota('ai-solution'), true, 'first answer generation is allowed');
select is(public.consume_ai_generation_quota('ai-solution'), true, 'second answer generation is allowed');
select is(public.consume_ai_generation_quota('ai-solution'), true, 'third answer generation is allowed');
select is(public.consume_ai_generation_quota('ai-solution'), true, 'fourth answer generation is allowed');
select is(public.consume_ai_generation_quota('ai-solution'), true, 'fifth answer generation is allowed');
select is(public.consume_ai_generation_quota('ai-solution'), false, 'sixth answer generation is blocked');
select is(public.consume_ai_generation_quota('ai-chapter-note'), true, 'chapter-note quota is independent from answer quota');
select is(public.consume_ai_generation_quota('ai-chapter-note'), true, 'second chapter-note generation is allowed');
select is(public.consume_ai_generation_quota('ai-chapter-note'), true, 'third chapter-note generation is allowed');
select is(public.consume_ai_generation_quota('ai-chapter-note'), false, 'fourth chapter-note generation is blocked');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000022';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000022","role":"authenticated","email":"quota-outsider@example.test"}';
select is(public.consume_ai_generation_quota('ai-solution'), true, 'another account has an independent quota');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000021';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000021","role":"authenticated","email":"quota-owner@example.test"}';
select is(public.consume_ai_generation_quota('ai-solution'), false, 'another account cannot reset the first account quota');

select ok(
  not has_table_privilege('authenticated', 'public.ai_generation_rate_limits', 'select'),
  'authenticated users cannot read or alter raw quota records'
);
select throws_ok(
  $select public.consume_ai_generation_quota('unsupported')$,
  'P0001',
  'Unsupported AI generation bucket',
  'clients cannot create arbitrary quota buckets'
);

set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{}';
select throws_ok(
  $select public.consume_ai_generation_quota('ai-solution')$,
  'P0001',
  'Authentication required',
  'unauthenticated requests cannot consume or create quotas'
);

select * from finish();
rollback;
