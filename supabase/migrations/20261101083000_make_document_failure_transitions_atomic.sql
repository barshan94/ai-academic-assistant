create or replace function public.fail_document_processing(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
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

  if p_document_id is null or p_owner_id is null or p_job_id is null then
    raise exception 'Document, owner and processing job are required';
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

  -- Match the completion RPC lock order: job first, then document.
  perform 1
  from public.processing_jobs
  where id = p_job_id
    and document_id = p_document_id
    and owner_id = p_owner_id
    and status = 'running'
  for update;

  if not found then
    raise exception 'The processing job is no longer running or does not match the document';
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
  returning id into v_failed_job_id;

  if v_failed_job_id is null then
    raise exception 'The processing job failure state could not be persisted';
  end if;

  return true;
end;
$$;

revoke all on function public.fail_document_processing(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.fail_document_processing(uuid, uuid, uuid, text) to authenticated, service_role;
