-- A chapter note may cite only reviewed questions explicitly classified to its chapter.
-- Enforce this at the database boundary, not only in the workspace form.
create or replace function public.create_chapter_note_draft(
  p_catalog_id uuid, p_chapter_id uuid, p_title text, p_content_json jsonb,
  p_question_ids uuid[], p_document_page_ids uuid[], p_supersedes_id uuid
)
returns uuid language plpgsql security invoker set search_path = ''
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
  if p_content_json is null or jsonb_typeof(p_content_json) <> 'object' or octet_length(p_content_json::text) > 200000 then raise exception 'Invalid chapter note content'; end if;
  select coalesce(array_agg(distinct selected.id), '{}'::uuid[]) into v_question_ids from unnest(coalesce(p_question_ids, '{}'::uuid[])) as selected(id);
  select coalesce(array_agg(distinct selected.id), '{}'::uuid[]) into v_page_ids from unnest(coalesce(p_document_page_ids, '{}'::uuid[])) as selected(id);
  if cardinality(v_question_ids) + cardinality(v_page_ids) not between 1 and 40 then raise exception 'Select between 1 and 40 source references'; end if;
  if not exists (select 1 from public.syllabus_chapters chapter where chapter.id=p_chapter_id and chapter.catalog_id=p_catalog_id and chapter.owner_id=v_owner_id) then raise exception 'Chapter does not belong to this account and syllabus'; end if;
  if exists (
    select 1 from unnest(v_question_ids) selected(id)
    where not exists (
      select 1 from public.questions question
      where question.id=selected.id
        and question.owner_id=v_owner_id
        and question.review_status='approved'
        and question.syllabus_catalog_id=p_catalog_id
        and question.syllabus_chapter_id=p_chapter_id
    )
  ) then
    raise exception 'Every question source must be approved and classified to this chapter';
  end if;
  if exists (select 1 from unnest(v_page_ids) selected(id) where not exists (select 1 from public.document_pages page where page.id=selected.id and page.owner_id=v_owner_id)) then raise exception 'A selected document page is not owned by this account'; end if;
  if p_supersedes_id is not null and not exists (select 1 from public.chapter_note_versions prior where prior.id=p_supersedes_id and prior.owner_id=v_owner_id and prior.catalog_id=p_catalog_id and prior.chapter_id=p_chapter_id) then raise exception 'The revision target is not a note in this chapter'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_chapter_id::text, 0));
  select coalesce(max(note.version_number),0)+1 into v_version_number from public.chapter_note_versions note where note.owner_id=v_owner_id and note.chapter_id=p_chapter_id;
  insert into public.chapter_note_versions(owner_id,catalog_id,chapter_id,version_number,title,content_json,status,supersedes_id)
  values(v_owner_id,p_catalog_id,p_chapter_id,v_version_number,trim(p_title),p_content_json,'draft',p_supersedes_id) returning id into v_note_id;
  insert into public.chapter_note_sources(owner_id,note_version_id,source_kind,question_id) select v_owner_id,v_note_id,'question',selected.id from unnest(v_question_ids) selected(id);
  insert into public.chapter_note_sources(owner_id,note_version_id,source_kind,document_page_id) select v_owner_id,v_note_id,'document_page',selected.id from unnest(v_page_ids) selected(id);
  return v_note_id;
end;
$$;

-- Source status/classification can change after a draft is created. Revalidate
-- every question source at the approval boundary as well.
create or replace function public.guard_chapter_note_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.approved_by is not null or new.approved_at is not null then
      raise exception 'Chapter notes must be created as unapproved drafts';
    end if;
    if new.owner_id <> (select auth.uid()) then
      raise exception 'Chapter note owner must match the authenticated user';
    end if;
    return new;
  end if;

  if row(
    new.owner_id, new.catalog_id, new.chapter_id, new.version_number,
    new.title, new.content_json, new.supersedes_id, new.created_at
  ) is distinct from row(
    old.owner_id, old.catalog_id, old.chapter_id, old.version_number,
    old.title, old.content_json, old.supersedes_id, old.created_at
  ) then
    raise exception 'Chapter note content is immutable; create a new version instead';
  end if;

  if old.status = 'draft' and new.status = 'approved' then
    if not exists (
      select 1 from public.chapter_note_sources as source
      where source.note_version_id = old.id and source.owner_id = old.owner_id
    ) then
      raise exception 'A chapter note needs at least one source before approval';
    end if;
    if exists (
      select 1
      from public.chapter_note_sources as source
      left join public.questions as question
        on question.id = source.question_id and question.owner_id = source.owner_id
      where source.note_version_id = old.id
        and source.owner_id = old.owner_id
        and source.source_kind = 'question'
        and (
          question.id is null
          or question.review_status <> 'approved'
          or question.syllabus_catalog_id is distinct from old.catalog_id
          or question.syllabus_chapter_id is distinct from old.chapter_id
        )
    ) then
      raise exception 'Every question source must remain approved and classified to this chapter';
    end if;
    new.approved_by := (select auth.uid());
    new.approved_at := now();
    return new;
  end if;

  if old.status in ('draft', 'approved') and new.status = 'archived' then
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Invalid chapter note status transition';
  end if;

  new.approved_by := old.approved_by;
  new.approved_at := old.approved_at;
  return new;
end;
$$;
