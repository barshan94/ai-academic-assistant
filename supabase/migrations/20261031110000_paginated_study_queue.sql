-- Paginated, account-wide study queue. Each page is small; totals remain exact.
create index if not exists question_revision_progress_owner_due_page_idx
  on public.question_revision_progress(owner_id, next_review_at, question_id);

create index if not exists practice_set_items_owner_open_page_idx
  on public.practice_set_items(owner_id, practice_set_id, position)
  where outcome is null;

create or replace function public.get_study_queue_page(
  p_revision_page integer default 1,
  p_practice_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_revision_page integer := greatest(coalesce(p_revision_page, 1), 1);
  v_practice_page integer := greatest(coalesce(p_practice_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 25), 1), 50);
  v_result jsonb;
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;

  select jsonb_build_object(
    'revision_total', (
      select count(*) from public.question_revision_progress rp
      join public.questions q on q.id = rp.question_id and q.owner_id = rp.owner_id
      where rp.owner_id = v_owner_id
        and rp.next_review_at <= now()
        and q.review_status = 'approved'
    ),
    'revision_items', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.next_review_at, x.question_id), '[]'::jsonb)
      from (
        select rp.question_id, rp.confidence, rp.status, rp.next_review_at, rp.review_count,
          q.question_text, q.question_number, q.subject, q.chapter, q.topic
        from public.question_revision_progress rp
        join public.questions q on q.id = rp.question_id and q.owner_id = rp.owner_id
        where rp.owner_id = v_owner_id
          and rp.next_review_at <= now()
          and q.review_status = 'approved'
        order by rp.next_review_at, rp.question_id
        limit v_page_size offset ((v_revision_page - 1) * v_page_size)
      ) x
    ),
    'practice_total', (
      select count(*)
      from public.practice_set_items i
      join public.practice_sets s on s.id = i.practice_set_id and s.owner_id = i.owner_id
      where i.owner_id = v_owner_id and i.outcome is null and s.status = 'in_progress'
    ),
    'practice_items', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at, x.practice_set_id, x.position), '[]'::jsonb)
      from (
        select i.id, i.practice_set_id, i.position, i.question_text, i.question_number,
          i.subject, i.chapter, i.topic, i.created_at, s.title as set_title
        from public.practice_set_items i
        join public.practice_sets s on s.id = i.practice_set_id and s.owner_id = i.owner_id
        where i.owner_id = v_owner_id and i.outcome is null and s.status = 'in_progress'
        order by i.created_at, i.practice_set_id, i.position
        limit v_page_size offset ((v_practice_page - 1) * v_page_size)
      ) x
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_study_queue_page(integer, integer, integer) from public, anon;
grant execute on function public.get_study_queue_page(integer, integer, integer) to authenticated;
