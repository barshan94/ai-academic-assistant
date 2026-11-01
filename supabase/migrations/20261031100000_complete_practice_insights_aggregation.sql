-- Complete, owner-scoped practice analytics are aggregated in PostgreSQL.
-- The browser receives only summary totals, eight weekly buckets, top topic groups,
-- and the twelve most recent sessions—not thousands of individual answer rows.

create index practice_set_items_owner_answered_idx
  on public.practice_set_items (owner_id, answered_at desc)
  include (outcome, subject, chapter, topic)
  where outcome is not null;

create or replace function public.get_practice_insights()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_owner_id is null then
    raise exception 'Authentication required';
  end if;

  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total_sets', (select count(*) from public.practice_sets s where s.owner_id = v_owner_id),
      'total_items', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id),
      'marked', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id and i.outcome is not null),
      'correct', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id and i.outcome = 'correct'),
      'partial', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id and i.outcome = 'partial'),
      'incorrect', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id and i.outcome = 'incorrect'),
      'skipped', (select count(*) from public.practice_set_items i where i.owner_id = v_owner_id and i.outcome = 'skipped')
    ),
    'weekly', (
      with week_series as (
        select (
          date_trunc('week', timezone('UTC', now()))
          - ((7 - n) * interval '7 days')
        ) as week_start
        from generate_series(0, 7) as series(n)
      )
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'week_start', to_char(w.week_start, 'YYYY-MM-DD'),
          'marked', a.marked,
          'scored', a.scored,
          'correct', a.correct,
          'partial', a.partial,
          'incorrect', a.incorrect,
          'skipped', a.skipped
        ) order by w.week_start
      ), '[]'::jsonb)
      from week_series w
      cross join lateral (
        select
          count(*) filter (where i.outcome is not null)::integer as marked,
          count(*) filter (where i.outcome in ('correct', 'partial', 'incorrect'))::integer as scored,
          count(*) filter (where i.outcome = 'correct')::integer as correct,
          count(*) filter (where i.outcome = 'partial')::integer as partial,
          count(*) filter (where i.outcome = 'incorrect')::integer as incorrect,
          count(*) filter (where i.outcome = 'skipped')::integer as skipped
        from public.practice_set_items i
        where i.owner_id = v_owner_id
          and i.answered_at >= (w.week_start at time zone 'UTC')
          and i.answered_at < ((w.week_start + interval '7 days') at time zone 'UTC')
      ) a
    ),
    'topics', (
      select coalesce(jsonb_agg(to_jsonb(t) order by (t.partial + t.incorrect) desc, t.total desc, t.subject, t.chapter, t.topic), '[]'::jsonb)
      from (
        select
          coalesce(nullif(btrim(i.subject), ''), 'Unmapped subject') as subject,
          coalesce(nullif(btrim(i.chapter), ''), 'Unmapped chapter') as chapter,
          coalesce(nullif(btrim(i.topic), ''), 'Unmapped topic') as topic,
          count(*)::integer as total,
          count(*) filter (where i.outcome = 'correct')::integer as correct,
          count(*) filter (where i.outcome = 'partial')::integer as partial,
          count(*) filter (where i.outcome = 'incorrect')::integer as incorrect,
          count(*) filter (where i.outcome = 'skipped')::integer as skipped
        from public.practice_set_items i
        where i.owner_id = v_owner_id and i.outcome is not null
        group by 1, 2, 3
        order by
          count(*) filter (where i.outcome in ('partial', 'incorrect')) desc,
          count(*) desc,
          1, 2, 3
        limit 100
      ) t
    ),
    'recent_sessions', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]'::jsonb)
      from (
        select id, title, status, question_count, created_at, completed_at
        from public.practice_sets
        where owner_id = v_owner_id
        order by created_at desc
        limit 12
      ) s
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_practice_insights() from public, anon;
grant execute on function public.get_practice_insights() to authenticated;
