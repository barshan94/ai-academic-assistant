create index if not exists question_teacher_invites_question_owner_fk_idx
  on public.question_teacher_invites (question_id, owner_id);