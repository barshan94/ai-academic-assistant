-- Keep manual OCR correction and parent-document review state in one transaction.
-- Lock order follows processing RPCs: job, document, then page.
create or replace function public.save_document_page_correction(
  p_document_id uuid,
  p_owner_id uuid,
  p_page_id uuid,
  p_extracted_text text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job_status text;
  v_document_status text;
  v_updated_page_id uuid;
  v_updated_document_id uuid;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
  end if;

  if p_document_id is null or p_owner_id is null or p_page_id is null
    or p_extracted_text is null
    or length(btrim(p_extracted_text)) = 0
    or length(p_extracted_text) > 50000 then
    raise exception 'Document correction parameters are invalid';
  end if;

  select status
  into v_job_status
  from public.processing_jobs
  where document_id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'The document processing job was not found';
  end if;

  if v_job_status = 'running' then
    raise exception 'A document cannot be corrected while processing is active';
  end if;

  select status
  into v_document_status
  from public.documents
  where id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Document not found or not owned by the caller' using errcode = '42501';
  end if;

  if v_document_status not in ('review_required', 'ready') then
    raise exception 'Only extracted documents awaiting or already through review can be corrected';
  end if;

  perform 1
  from public.document_pages
  where id = p_page_id
    and document_id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'The selected page does not belong to this document';
  end if;

  update public.document_pages
  set extracted_text = p_extracted_text,
      extraction_method = 'manual',
      status = 'review_required'
  where id = p_page_id
    and document_id = p_document_id
    and owner_id = p_owner_id
  returning id into v_updated_page_id;

  if v_updated_page_id is null then
    raise exception 'The page correction could not be saved';
  end if;

  update public.documents
  set status = 'review_required',
      updated_at = clock_timestamp()
  where id = p_document_id
    and owner_id = p_owner_id
  returning id into v_updated_document_id;

  if v_updated_document_id is null then
    raise exception 'The document review state could not be updated';
  end if;

  return true;
end;
$$;

revoke all on function public.save_document_page_correction(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.save_document_page_correction(uuid, uuid, uuid, text) to authenticated;


-- Manual terminal recovery is only allowed after the retry budget is exhausted.
-- A recoverable stale lease with attempts remaining must go through the atomic
-- claim RPC, which starts the next attempt without an intermediate failed state.
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
  returning id into v_recovered_job_id;

  if v_recovered_job_id is null then
    raise exception 'The stale processing job could not be recovered';
  end if;

  return true;
end;
$$;

revoke all on function public.recover_stale_document_processing_job(uuid, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.recover_stale_document_processing_job(uuid, uuid, uuid, timestamptz) to authenticated, service_role;
