-- Owner-private revision tracking for approved questions.
-- Confidence is self-reported; it is not an assessment of objective mastery.

create table public.question_revision_progress (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null,
  confidence smallint not null check (confidence between 1 and 5),
  status text not null check (status in ('learning', 'review', 'confident')),
  next_review_at timestamptz not null,
  last_reviewed_at timestamptz not null default now(),
  review_count integer not null default 1 check (review_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, question_id),
  foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade
);

create index question_revision_progress_due_idx
  on public.question_revision_progress(owner_id, next_review_at);

alter table public.question_revision_progress enable row level security;

create policy "question_revision_progress_owner_select"
  on public.question_revision_progress for select to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.question_revision_progress from anon, public, authenticated;
grant select on public.question_revision_progress to authenticated;

create or replace function public.record_question_revision(
  p_question_id uuid,
  p_confidence integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_interval_days integer;
  v_status text;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  if p_question_id is null or p_confidence not between 1 and 5 then
    raise exception 'A valid question and confidence score from 1 to 5 are required';
  end if;

  if not exists (
    select 1 from public.questions as q
    where q.id = p_question_id
      and q.owner_id = v_owner_id
      and q.review_status = 'approved'
  ) then
    raise exception 'Only your approved questions can be added to revision tracking';
  end if;

  v_interval_days := case p_confidence
    when 1 then 1
    when 2 then 2
    when 3 then 4
    when 4 then 7
    when 5 then 14
  end;

  v_status := case
    when p_confidence <= 2 then 'learning'
    when p_confidence = 3 then 'review'
    else 'confident'
  end;

  insert into public.question_revision_progress (
    owner_id, question_id, confidence, status, next_review_at,
    last_reviewed_at, review_count, updated_at
  ) values (
    v_owner_id, p_question_id, p_confidence, v_status,
    now() + (v_interval_days || ' days')::interval,
    now(), 1, now()
  )
  on conflict (owner_id, question_id) do update
    set confidence = excluded.confidence,
        status = excluded.status,
        next_review_at = excluded.next_review_at,
        last_reviewed_at = now(),
        review_count = public.question_revision_progress.review_count + 1,
        updated_at = now();
end;
$$;

revoke all on function public.record_question_revision(uuid, integer) from public, anon;
grant execute on function public.record_question_revision(uuid, integer) to authenticated;
