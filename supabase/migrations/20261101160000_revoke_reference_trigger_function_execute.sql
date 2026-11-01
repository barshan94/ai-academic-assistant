-- Trigger functions are invoked by PostgreSQL, not exposed as RPC endpoints.
-- Remove inherited/default EXECUTE grants from every API role while preserving
-- the trigger bindings and owner-level administration.
revoke all on function public.guard_reference_syllabus_catalog()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_reference_syllabus_structure()
  from public, anon, authenticated, service_role;
revoke all on function public.reject_reference_syllabus_evidence_mutation()
  from public, anon, authenticated, service_role;
