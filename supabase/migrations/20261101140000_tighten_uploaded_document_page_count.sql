-- Keep the trusted upload-registration RPC aligned with the public upload
-- contract. This is forward-only: do not rewrite the historical migration.
-- CREATE OR REPLACE preserves the existing function owner and execute ACL.
create or replace function public.register_uploaded_document(
  p_owner_id uuid,
  p_file_name text,
  p_file_size_bytes bigint,
  p_sha256 text,
  p_drive_file_id text,
  p_drive_web_view_link text,
  p_page_count integer
)
returns table (
  document_id uuid,
  duplicate boolean,
  stored_drive_file_id text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_existing_drive_file_id text;
  v_idempotency_key text;
  v_job_id uuid;
begin
  if current_user not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  end if;

  if p_owner_id is null
    or p_file_name is null
    or length(btrim(p_file_name)) < 1
    or length(p_file_name) > 500
    or p_file_size_bytes is null
    or p_file_size_bytes < 1
    or p_file_size_bytes > 52428800
    or p_sha256 is null
    or p_sha256 !~ '^[a-f0-9]{64}$'
    or p_drive_file_id is null
    or length(btrim(p_drive_file_id)) = 0
    or (p_page_count is not null and (p_page_count < 1 or p_page_count > 50)) then
    raise exception 'Uploaded document metadata is invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    1,
    pg_catalog.hashtext(p_owner_id::text || ':' || p_sha256)
  );

  select id, drive_file_id
  into v_document_id, v_existing_drive_file_id
  from public.documents
  where owner_id = p_owner_id
    and sha256 = p_sha256
  for update;

  if v_document_id is not null then
    return query select v_document_id, true, v_existing_drive_file_id;
    return;
  end if;

  v_idempotency_key := p_owner_id::text || ':' || p_sha256 || ':validate';

  insert into public.documents (
    owner_id, file_name, mime_type, file_size_bytes, sha256,
    drive_file_id, drive_web_view_link, page_count, status
  )
  values (
    p_owner_id, p_file_name, 'application/pdf', p_file_size_bytes, p_sha256,
    p_drive_file_id, p_drive_web_view_link, p_page_count, 'queued'
  )
  on conflict (owner_id, sha256) do nothing
  returning id into v_document_id;

  if v_document_id is null then
    select id, drive_file_id
    into v_document_id, v_existing_drive_file_id
    from public.documents
    where owner_id = p_owner_id
      and sha256 = p_sha256
    for update;

    if v_document_id is null then
      raise exception 'The document could not be registered';
    end if;

    return query select v_document_id, true, v_existing_drive_file_id;
    return;
  end if;

  insert into public.processing_jobs (
    owner_id, document_id, stage, status, idempotency_key
  )
  values (
    p_owner_id, v_document_id, 'validate', 'queued', v_idempotency_key
  )
  returning id into v_job_id;

  if v_job_id is null then
    raise exception 'The document processing job could not be created';
  end if;

  return query select v_document_id, false, p_drive_file_id;
end;
$$;

-- Explicitly restate the intended server-only execute boundary.
revoke all on function public.register_uploaded_document(uuid, text, bigint, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.register_uploaded_document(uuid, text, bigint, text, text, text, integer)
  to service_role;
