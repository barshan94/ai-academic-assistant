create or replace function public.claim_document_processing_job(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
  p_expected_status text,
  p_expected_attempt_count integer,
  p_expected_started_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claimed_job_id uuid;
  v_processing_document_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  end if;

  if p_document_id is null or p_owner_id is null or p_job_id is null
    or p_expected_attempt_count is null or p_expected_attempt_count < 0
    or p_expected_status is null
    or p_expected_status not in ('queued', 'failed', 'running') then
    raise exception 'Document processing claim parameters are invalid';
  end if;

  -- Serialize the claim and parent-document transition. Running jobs can only
  -- be reclaimed when the exact observed lease is still stale.
  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = p_expected_status
    and attempt_count = p_expected_attempt_count
    and attempt_count < max_attempts
    and started_at is not distinct from p_expected_started_at
    and (
      p_expected_status <> 'running'
      or started_at is null
      or started_at < clock_timestamp() - interval '15 minutes'
    )
  for update;

  if not found then
    return false;
  end if;

  update public.processing_jobs
  set status = 'running',
      stage = 'ocr',
      progress = 10,
      attempt_count = attempt_count + 1,
      started_at = clock_timestamp(),
      error_code = null,
      error_message = null,
      updated_at = clock_timestamp()
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = p_expected_status
    and attempt_count = p_expected_attempt_count
    and started_at is not distinct from p_expected_started_at
  returning id into v_claimed_job_id;

  if v_claimed_job_id is null then
    raise exception 'The processing job could not be claimed';
  end if;

  update public.documents
  set status = 'processing',
      updated_at = clock_timestamp()
  where id = p_document_id
    and owner_id = p_owner_id
    and status <> 'ready'
  returning id into v_processing_document_id;

  if v_processing_document_id is null then
    raise exception 'The source document cannot enter processing state';
  end if;

  return true;
end;
$$;

revoke all on function public.claim_document_processing_job(uuid, uuid, uuid, text, integer, timestamptz) from public, anon;
grant execute on function public.claim_document_processing_job(uuid, uuid, uuid, text, integer, timestamptz) to authenticated, service_role;

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

  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
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
