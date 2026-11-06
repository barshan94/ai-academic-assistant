-- Public RPC wrappers must cross into the non-exposed private schema.
-- Run as the function owner, while the private SECURITY DEFINER routines
-- continue to enforce auth.uid(), ownership, invitee email, and invite state.
-- Keep the wrappers callable only by authenticated application users and
-- service_role; do not expose them to anon or PUBLIC.

alter function public.create_question_teacher_invite(uuid, text) security definer;
alter function public.accept_question_teacher_invite(uuid) security definer;
alter function public.revoke_question_teacher_invite(uuid) security definer;
alter function public.record_teacher_solution_review(uuid, text, text) security definer;

revoke all on function public.create_question_teacher_invite(uuid, text) from public, anon;
revoke all on function public.accept_question_teacher_invite(uuid) from public, anon;
revoke all on function public.revoke_question_teacher_invite(uuid) from public, anon;
revoke all on function public.record_teacher_solution_review(uuid, text, text) from public, anon;

grant execute on function public.create_question_teacher_invite(uuid, text) to authenticated, service_role;
grant execute on function public.accept_question_teacher_invite(uuid) to authenticated, service_role;
grant execute on function public.revoke_question_teacher_invite(uuid) to authenticated, service_role;
grant execute on function public.record_teacher_solution_review(uuid, text, text) to authenticated, service_role;
