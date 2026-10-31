create or replace function public.bulk_update_question_classification_status(
  question_ids uuid[],
  target_status text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  locked_count integer;
  updated_count integer;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  if target_status not in ('unreviewed', 'uncertain') then
    raise exception 'Bulk confirmation is not permitted';
  end if;

  if question_ids is null
    or cardinality(question_ids) < 1
    or cardinality(question_ids) > 50
    or cardinality(question_ids) <> (
      select count(distinct item) from unnest(question_ids) as item
    )
  then
    raise exception 'Select between 1 and 50 unique question IDs';
  end if;

  -- Lock every selected pending question before changing any of them.
  -- If one is missing, inaccessible, or no longer pending, the whole
  -- function call raises and PostgreSQL rolls the transaction back.
  perform q.id
  from public.questions as q
  where q.id = any(question_ids)
    and q.owner_id = actor_id
    and q.classification_status in ('unreviewed', 'uncertain')
  for update;

  get diagnostics locked_count = row_count;
  if locked_count <> cardinality(question_ids) then
    raise exception 'The selected batch is stale or contains inaccessible questions';
  end if;

  -- Every successful update must change the state so the existing
  -- classification-history trigger records an audit snapshot per question.
  if exists (
    select 1
    from public.questions as q
    where q.id = any(question_ids)
      and q.owner_id = actor_id
      and q.classification_status = target_status
  ) then
    raise exception 'BULK_REVIEW_NO_CHANGE: one or more selected questions are already in that state';
  end if;

  update public.questions as q
  set classification_status = target_status
  where q.id = any(question_ids)
    and q.owner_id = actor_id;

  get diagnostics updated_count = row_count;
  if updated_count <> cardinality(question_ids) then
    raise exception 'The complete batch could not be updated';
  end if;

  return updated_count;
end;
$$;

revoke all on function public.bulk_update_question_classification_status(uuid[], text)
  from public, anon;
grant execute on function public.bulk_update_question_classification_status(uuid[], text)
  to authenticated;

comment on function public.bulk_update_question_classification_status(uuid[], text) is
  'Atomically moves 1–50 owner-owned pending question classifications between unreviewed and uncertain; never confirms mappings. Classification history is captured by the question trigger.';
