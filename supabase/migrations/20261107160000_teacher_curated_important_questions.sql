create table public.question_importance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null,
  importance_level text not null check (importance_level in ('high', 'medium', 'core')),
  rationale text not null default '' check (length(rationale) <= 500),
  marked_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_importance_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade,
  constraint question_importance_question_owner_unique unique (question_id, owner_id)
);

create index question_importance_owner_level_idx
  on public.question_importance(owner_id, importance_level, updated_at desc);

alter table public.question_importance enable row level security;

create policy "question_importance_owner_select"
  on public.question_importance for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "question_importance_owner_insert"
  on public.question_importance for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select auth.uid()) = marked_by
    and exists (
      select 1 from public.questions q
      where q.id = question_importance.question_id
        and q.owner_id = question_importance.owner_id
        and q.review_status = 'approved'
    )
  );

create policy "question_importance_owner_update"
  on public.question_importance for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and (select auth.uid()) = marked_by
    and exists (
      select 1 from public.questions q
      where q.id = question_importance.question_id
        and q.owner_id = question_importance.owner_id
        and q.review_status = 'approved'
    )
  );

create policy "question_importance_owner_delete"
  on public.question_importance for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "question_importance_shared_teacher_select"
  on public.question_importance for select to authenticated
  using (exists (
    select 1 from public.question_teacher_invites invite
    where invite.question_id = question_importance.question_id
      and invite.owner_id = question_importance.owner_id
      and invite.accepted_by = (select auth.uid())
      and invite.revoked_at is null
  ));

grant select, insert, update, delete on public.question_importance to authenticated;
revoke all on public.question_importance from anon;
