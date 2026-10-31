-- Replace extracted document pages as one transaction.
-- The FK restriction prevents a concurrent academic reference from being cascaded away.
alter table public.questions
  drop constraint questions_page_owner_fk;

alter table public.questions
  add constraint questions_page_owner_fk
  foreign key (document_page_id, owner_id)
  references public.document_pages(id, owner_id)
  on delete restrict;

create or replace function public.replace_document_pages(
  p_document_id uuid,
  p_owner_id uuid,
  p_pages jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_page_count integer;
begin
  if p_document_id is null or p_owner_id is null then
    raise exception 'Document and owner are required';
  end if;

  if (select auth.uid()) is not null then
    if (select auth.uid()) <> p_owner_id then
      raise exception 'Document owner does not match the authenticated user' using errcode = '42501';
    end if;
  elsif current_user not in ('service_role', 'postgres') then
    raise exception 'A trusted server role or authenticated owner is required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_pages) is distinct from 'array' then
    raise exception 'Extracted pages must be supplied as a JSON array';
  end if;

  v_page_count := jsonb_array_length(p_pages);
  if v_page_count < 1 or v_page_count > 100 then
    raise exception 'A document must contain between 1 and 100 extracted pages';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_pages) as item(value)
    where jsonb_typeof(item.value) is distinct from 'string'
       or length(btrim(item.value #>> '{}')) = 0
  ) then
    raise exception 'Every extracted page must contain non-empty text';
  end if;

  perform 1
  from public.documents as document
  where document.id = p_document_id
    and document.owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Document not found or not owned by the caller' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.document_pages as page
    join public.questions as question
      on question.document_page_id = page.id
     and question.owner_id = page.owner_id
    where page.document_id = p_document_id
      and page.owner_id = p_owner_id
  ) or exists (
    select 1
    from public.document_pages as page
    join public.chapter_note_sources as source
      on source.document_page_id = page.id
     and source.owner_id = page.owner_id
    where page.document_id = p_document_id
      and page.owner_id = p_owner_id
  ) then
    raise exception 'Reprocessing is blocked because saved academic records reference these pages';
  end if;

  delete from public.document_pages
  where document_id = p_document_id
    and owner_id = p_owner_id;

  insert into public.document_pages (
    owner_id, document_id, page_number, extracted_text, extraction_method, status
  )
  select
    p_owner_id,
    p_document_id,
    item.ordinality::integer,
    item.value #>> '{}',
    'ocr',
    'review_required'
  from jsonb_array_elements(p_pages) with ordinality as item(value, ordinality);

  update public.documents
  set status = 'review_required',
      page_count = v_page_count,
      updated_at = now()
  where id = p_document_id
    and owner_id = p_owner_id;

  return v_page_count;
end;
$$;

revoke all on function public.replace_document_pages(uuid, uuid, jsonb) from public, anon;
grant execute on function public.replace_document_pages(uuid, uuid, jsonb) to authenticated, service_role;
