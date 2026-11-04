-- Make reviewed-source validation and question insertion one transaction.
-- The document row lock serializes this with OCR correction/review transitions.
create or replace function public.create_question_from_reviewed_page(
  p_document_id uuid,
  p_document_page_id uuid,
  p_owner_id uuid,
  p_question_text text,
  p_question_number text default null,
  p_board text default null,
  p_qualification text default null,
  p_subject text default null,
  p_chapter text default null,
  p_topic text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_status text;
  v_page_id uuid;
  v_question_id uuid;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'Question owner does not match the authenticated user' using errcode = '42501';
  end if;

  if p_document_id is null or p_document_page_id is null or p_owner_id is null
    or p_question_text is null
    or length(btrim(p_question_text)) = 0
    or length(p_question_text) > 20000 then
    raise exception 'Question source or text is invalid';
  end if;

  select status
    into v_document_status
  from public.documents
  where id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Source document not found or not owned by the caller' using errcode = '42501';
  end if;

  if v_document_status <> 'ready' then
    raise exception 'The source document must be reviewed before creating questions';
  end if;

  select id
    into v_page_id
  from public.document_pages
  where id = p_document_page_id
    and document_id = p_document_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'The selected page does not belong to this document' using errcode = '42501';
  end if;

  insert into public.questions (
    owner_id, document_id, document_page_id, question_number,
    question_text, board, qualification, subject, chapter, topic,
    review_status
  ) values (
    p_owner_id, p_document_id, v_page_id, nullif(btrim(p_question_number), ''),
    btrim(p_question_text), nullif(btrim(p_board), ''),
    nullif(btrim(p_qualification), ''), nullif(btrim(p_subject), ''),
    nullif(btrim(p_chapter), ''), nullif(btrim(p_topic), ''),
    'needs_review'
  )
  returning id into v_question_id;

  return v_question_id;
end;
$$;

revoke all on function public.create_question_from_reviewed_page(uuid, uuid, uuid, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_question_from_reviewed_page(uuid, uuid, uuid, text, text, text, text, text, text, text) to authenticated;
