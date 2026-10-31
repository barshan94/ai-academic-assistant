-- Create chapter note drafts atomically with their immutable source references.
create or replace function public.create_chapter_note_draft(
  p_catalog_id uuid,
  p_chapter_id uuid,
  p_title text,
  p_content_json jsonb,
  p_question_ids uuid[] default '{}'::uuid[],
  p_document_page_ids uuid[] default '{}'::uuid[],
  p_supersedes_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_note_id uuid;
  v_version_number integer;
  v_question_ids uuid[];
  v_page_ids uuid[];
begin
  if v_owner_id is null then raise exception 'Authentication required'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 200 then raise exception 'Invalid chapter note title'; end if;
  if p_content_json is null or jsonb_typeof(p_content_json) <> 'object' or octet_length(p_content_json::text) > 200000 then
    raise exception 'Invalid chapter note content';
  end if;

  select coalesce(array_agg(distinct selected.id), '{}'::uuid[])
    into v_question_ids
    from unnest(coalesce(p_question_ids, '{}'::uuid[])) as selected(id);
  select coalesce(array_agg(distinct selected.id), '{}'::uuid[])
    into v_page_ids
    from unnest(coalesce(p_document_page_ids, '{}'::uuid[])) as selected(id);

  if cardinality(v_question_ids) + cardinality(v_page_ids) not between 1 and 40 then
    raise exception 'Select between 1 and 40 source references';
  end if;
  if not exists (
    select 1 from public.syllabus_chapters as chapter
    where chapter.id = p_chapter_id and chapter.catalog_id = p_catalog_id and chapter.owner_id = v_owner_id
  ) then raise exception 'Chapter does not belong to this account and syllabus'; end if;

  if exists (
    select 1 from unnest(v_question_ids) as selected(id)
    where not exists (select 1 from public.questions as question where question.id = selected.id and question.owner_id = v_owner_id)
  ) then raise exception 'A selected question is not owned by this account'; end if;
  if exists (
    select 1 from unnest(v_page_ids) as selected(id)
    where not exists (select 1 from public.document_pages as page where page.id = selected.id and page.owner_id = v_owner_id)
  ) then raise exception 'A selected document page is not owned by this account'; end if;
  if p_supersedes_id is not null and not exists (
    select 1 from public.chapter_note_versions as prior
    where prior.id = p_supersedes_id and prior.owner_id = v_owner_id
      and prior.catalog_id = p_catalog_id and prior.chapter_id = p_chapter_id
  ) then raise exception 'The revision target is not a note in this chapter'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_chapter_id::text, 0));
  select coalesce(max(note.version_number), 0) + 1 into v_version_number
    from public.chapter_note_versions as note
    where note.owner_id = v_owner_id and note.chapter_id = p_chapter_id;

  insert into public.chapter_note_versions (
    owner_id, catalog_id, chapter_id, version_number, title, content_json, status, supersedes_id
  ) values (
    v_owner_id, p_catalog_id, p_chapter_id, v_version_number, trim(p_title), p_content_json, 'draft', p_supersedes_id
  ) returning id into v_note_id;

  insert into public.chapter_note_sources (owner_id, note_version_id, source_kind, question_id)
    select v_owner_id, v_note_id, 'question', selected.id from unnest(v_question_ids) as selected(id);
  insert into public.chapter_note_sources (owner_id, note_version_id, source_kind, document_page_id)
    select v_owner_id, v_note_id, 'document_page', selected.id from unnest(v_page_ids) as selected(id);
  return v_note_id;
end;
$$;

revoke all on function public.create_chapter_note_draft(uuid, uuid, text, jsonb, uuid[], uuid[], uuid[]) from public, anon;
grant execute on function public.create_chapter_note_draft(uuid, uuid, text, jsonb, uuid[], uuid[], uuid[]) to authenticated;
