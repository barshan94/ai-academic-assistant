-- A stale job may only be terminalized by this recovery RPC after its
-- retry budget is exhausted. The route already checks this, but enforce it
-- inside the database boundary because authenticated owners can call RPCs.
create or replace function public.recover_stale_document_processing_job(
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
  v_recovered_document_id uuid;
  v_recovered_job_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  end if;

  if p_document_id is null or p_owner_id is null or p_job_id is null then
    raise exception 'Document, owner and processing job are required';
  end if;

  -- Fence recovery to the exact stale lease and an exhausted retry budget.
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
  returning id into v_recovered_document_id;

  if v_recovered_document_id is null then
    raise exception 'The stale document state could not be recovered';
  end if;

  update public.processing_jobs
  set status = 'failed',
      error_code = 'STALE_PROCESSING_RECOVERED',
      error_message = 'A previous processing attempt stopped responding and was marked recoverable.',
      completed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count >= max_attempts
    and started_at is not distinct from p_expected_started_at
  returning id into v_recovered_job_id;

  if v_recovered_job_id is null then
    raise exception 'The stale processing job could not be recovered';
  end if;

  return true;
end;
$$;

revoke all on function public.recover_stale_document_processing_job(uuid, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.recover_stale_document_processing_job(uuid, uuid, uuid, timestamptz) to authenticated, service_role;
