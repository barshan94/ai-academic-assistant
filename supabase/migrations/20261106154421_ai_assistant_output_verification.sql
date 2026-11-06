alter table public.ai_assistant_outputs
  add column if not exists verification_status text not null default 'not_verified'
    check (verification_status in ('not_verified','partial_arithmetic_checks_passed','arithmetic_check_failed')),
  add column if not exists verification_details jsonb not null default '[]'::jsonb;