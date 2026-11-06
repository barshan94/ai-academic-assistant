-- Fence every processing completion/failure to the exact attempt that claimed the job.
-- A worker whose 15-minute lease was reclaimed must not be able to overwrite
-- the newer attempt's pages or terminal state, even though the job ID is shared.
drop function if exists public.complete_document_processing(uuid, uuid, uuid, jsonb);
drop function if exists public.fail_document_processing(uuid, uuid, uuid, text);

create function public.complete_document_processing(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
  p_expected_attempt_count integer,
  p_pages jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_page_count integer;
  v_completed_job_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  end if;

  if p_document_id is null or p_owner_id is null or p_job_id is null
    or p_expected_attempt_count is null or p_expected_attempt_count < 1 then
    raise exception 'Document processing completion parameters are invalid';
  end if;

  -- The attempt counter is a fencing token. A reclaimed job increments it,
  -- making every response from the previous worker permanently stale.
  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count = p_expected_attempt_count
  for update;

  if not found then
    raise exception 'The processing attempt is stale or no longer running';
  end if;

  v_page_count := public.replace_document_pages(
    p_document_id,
    p_owner_id,
    p_pages
  );

  update public.processing_jobs
  set status = 'completed',
      stage = 'ocr',
      progress = 100,
      completed_at = clock_timestamp(),
      error_code = null,
      error_message = null,
      updated_at = clock_timestamp()
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count = p_expected_attempt_count
  returning id into v_completed_job_id;

  if v_completed_job_id is null then
    raise exception 'The processing job could not be finalized';
  end if;

  return v_page_count;
end;
$$;

create function public.fail_document_processing(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
  p_expected_attempt_count integer,
  p_error_code text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_failed_document_id uuid;
  v_failed_job_id uuid;
  v_error_message text;
begin
  if current_user not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  end if;

  if p_document_id is null or p_owner_id is null or p_job_id is null
    or p_expected_attempt_count is null or p_expected_attempt_count < 1 then
    raise exception 'Document processing failure parameters are invalid';
  end if;

  v_error_message := case p_error_code
    when 'DOCUMENT_PROCESSING_FAILED'
      then 'Document processing failed. Review the source file and reconnect Google Drive if needed.'
    when 'BACKGROUND_PROCESSING_FAILED'
      then 'Background processing failed. Retry the document or reconnect Google Drive if needed.'
    else null
  end;

  if v_error_message is null then
    raise exception 'Unsupported document processing error code';
  end if;

  -- Match completion's lock order and require the same attempt generation.
  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count = p_expected_attempt_count
  for update;

  if not found then
    raise exception 'The processing attempt is stale or no longer running';
  end if;

  update public.documents
  set status = 'failed',
      updated_at = clock_timestamp()
  where id = p_document_id
    and owner_id = p_owner_id
  returning id into v_failed_document_id;

  if v_failed_document_id is null then
    raise exception 'The document failure state could not be persisted';
  end if;

  update public.processing_jobs
  set status = 'failed',
      error_code = p_error_code,
      error_message = v_error_message,
      completed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
    and attempt_count = p_expected_attempt_count
  returning id into v_failed_job_id;

  if v_failed_job_id is null then
    raise exception 'The processing job failure state could not be persisted';
  end if;

  return true;
end;
$$;

revoke all on function public.complete_document_processing(uuid, uuid, uuid, integer, jsonb) from public, anon;
grant execute on function public.complete_document_processing(uuid, uuid, uuid, integer, jsonb) to authenticated, service_role;
revoke all on function public.fail_document_processing(uuid, uuid, uuid, integer, text) from public, anon;
grant execute on function public.fail_document_processing(uuid, uuid, uuid, integer, text) to authenticated, service_role;
