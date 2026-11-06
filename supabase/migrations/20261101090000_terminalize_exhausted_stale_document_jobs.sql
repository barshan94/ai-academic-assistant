create or replace function public.terminalize_exhausted_stale_document_job(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
  p_expected_started_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_failed_document_id uuid;
  v_failed_job_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception 'A trusted worker role is required' using errcode = '42501';
  end if;

  if p_document_id is null or p_owner_id is null or p_job_id is null then
    raise exception 'Document, owner and processing job are required';
  end if;

  -- Only terminalize the exact stale lease observed by the worker, and only
  -- after the retry budget is exhausted. A newer claim makes this a no-op.
  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count >= max_attempts
    and started_at is not distinct from p_expected_started_at
    and (
      started_at is null
      or started_at < clock_timestamp() - interval '15 minutes'
    )
  for update;

  if not found then
    return false;
  end if;

  update public.documents
  set status = 'failed',
      updated_at = clock_timestamp()
  where id = p_document_id
    and owner_id = p_owner_id
  returning id into v_failed_document_id;

  if v_failed_document_id is null then
    raise exception 'The exhausted document failure state could not be persisted';
  end if;

  update public.processing_jobs
  set status = 'failed',
      error_code = 'BACKGROUND_PROCESSING_FAILED',
      error_message = 'Background processing failed after the retry limit was reached.',
      completed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count >= max_attempts
    and started_at is not distinct from p_expected_started_at
  returning id into v_failed_job_id;

  if v_failed_job_id is null then
    raise exception 'The exhausted processing job could not be finalized';
  end if;

  return true;
end;
$$;

revoke all on function public.terminalize_exhausted_stale_document_job(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.terminalize_exhausted_stale_document_job(uuid, uuid, uuid, timestamptz) to service_role;
