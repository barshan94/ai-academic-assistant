create or replace function public.list_claimable_document_jobs(
  p_stale_before timestamptz,
  p_limit integer default 10
)
returns table (
  id uuid,
  owner_id uuid,
  document_id uuid,
  attempt_count integer,
  max_attempts integer,
  status text,
  started_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'A trusted worker role is required' using errcode = '42501';
  end if;

  if p_stale_before is null or p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'Document worker candidate query parameters are invalid';
  end if;

  return query
  select
    job.id,
    job.owner_id,
    job.document_id,
    job.attempt_count,
    job.max_attempts,
    job.status::text,
    job.started_at
  from public.processing_jobs as job
  where (
    job.status in ('queued', 'failed')
    and job.attempt_count < job.max_attempts
  ) or (
    job.status = 'running'
    and (
      job.started_at is null
      or job.started_at < p_stale_before
    )
  )
  order by job.created_at asc, job.id asc
  limit p_limit;
end;
$$;

revoke all on function public.list_claimable_document_jobs(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.list_claimable_document_jobs(timestamptz, integer) to service_role;
