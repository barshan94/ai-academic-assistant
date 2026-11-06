-- Keep invitation history visible to the invited account after revocation.
-- This reveals no question/solution data; those remain inaccessible because
-- question and solution RLS require an accepted, unrevoked invitation.

drop policy if exists "question_teacher_invites_select"
  on public.question_teacher_invites;

create policy "question_teacher_invites_select"
  on public.question_teacher_invites
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or lower(coalesce((select auth.jwt()) ->> 'email', '')) = invited_email
    or accepted_by = (select auth.uid())
  );
