-- Keep exposed RPC wrappers SECURITY INVOKER. Authenticated callers need
-- schema USAGE to reach the narrowly granted private SECURITY DEFINER routines.
-- The private schema is not included in PostgREST's exposed schemas.
alter function public.create_question_teacher_invite(uuid, text) security invoker;
alter function public.accept_question_teacher_invite(uuid) security invoker;
alter function public.revoke_question_teacher_invite(uuid) security invoker;
alter function public.record_teacher_solution_review(uuid, text, text) security invoker;

grant usage on schema private to authenticated;
revoke all on schema private from public, anon;

-- The private functions already have explicit EXECUTE grants for authenticated
-- and service_role. Do not grant blanket EXECUTE on the private schema.
