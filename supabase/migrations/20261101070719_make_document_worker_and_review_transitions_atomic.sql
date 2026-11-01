create or replace function public.complete_document_processing(
  p_document_id uuid,
  p_owner_id uuid,
  p_job_id uuid,
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

  if p_document_id is null or p_owner_id is null or p_job_id is null then
    raise exception 'Document, owner and processing job are required';
  end if;

  -- Lock and validate the running job before changing the document. The page
  -- replacement and job completion then commit or roll back as one transaction.
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
  returning id into v_completed_job_id;

  if v_completed_job_id is null then
    raise exception 'The processing job could not be finalized';
  end if;

  return v_page_count;
end;
$$;

revoke all on function public.complete_document_processing(uuid, uuid, uuid, jsonb) from public, anon;
grant execute on function public.complete_document_processing(uuid, uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.approve_document_review(
  p_document_id uuid,
  p_owner_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_status text;
  v_expected_page_count integer;
  v_page_count integer;
  v_updated_page_count integer;
  v_updated_document_count integer;
begin
  if p_document_id is null or p_owner_id is null then
    raise exception 'Document and owner are required';
  end if;

  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
  end if;

  select status, page_count
  into v_document_status, v_expected_page_count
  from public.documents
  where id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Document not found or not owned by the caller' using errcode = '42501';
  end if;

  if v_document_status <> 'review_required' then
    raise exception 'Only documents awaiting review can be approved';
  end if;

  -- Lock the page set after the parent row so replacement and approval share
  -- a consistent lock order.
  perform 1
  from public.document_pages
  where document_id = p_document_id
    and owner_id = p_owner_id
  for update;

  select count(*)::integer
  into v_page_count
  from public.document_pages
  where document_id = p_document_id
    and owner_id = p_owner_id;

  if v_page_count < 1 or v_page_count > 100
    or v_expected_page_count is distinct from v_page_count then
    raise exception 'The document page count is inconsistent and cannot be approved';
  end if;

  update public.document_pages
  set status = 'complete'
  where document_id = p_document_id
    and owner_id = p_owner_id;

  get diagnostics v_updated_page_count = row_count;
  if v_updated_page_count <> v_page_count then
    raise exception 'Not all document pages could be approved';
  end if;

  update public.documents
  set status = 'ready',
      updated_at = clock_timestamp()
  where id = p_document_id
    and owner_id = p_owner_id
    and status = 'review_required';

  get diagnostics v_updated_document_count = row_count;
  if v_updated_document_count <> 1 then
    raise exception 'The document could not be marked ready';
  end if;

  return v_page_count;
end;
$$;

revoke all on function public.approve_document_review(uuid, uuid) from public, anon;
grant execute on function public.approve_document_review(uuid, uuid) to authenticated;
