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
      select 1 from public.chapter_note_sources source
      where source.note_version_id = old.id and source.owner_id = old.owner_id
    ) then
      raise exception 'A chapter note needs at least one source before approval';
    end if;

    if exists (
      select 1 from public.chapter_note_sources source
      where source.note_version_id = old.id and source.owner_id = old.owner_id
        and source.source_kind = 'question'
        and not exists (
          select 1 from public.questions question
          where question.id = source.question_id and question.owner_id = old.owner_id
            and question.syllabus_chapter_id = old.chapter_id
            and question.review_status = 'approved'
        )
    ) then
      raise exception 'Every question source must remain approved and classified to this chapter';
    end if;

    if exists (
      select 1 from public.chapter_note_sources source
      where source.note_version_id = old.id and source.owner_id = old.owner_id
        and source.source_kind = 'document_page'
        and not exists (
          select 1 from public.document_pages page
          join public.questions question
            on question.document_page_id = page.id and question.owner_id = page.owner_id
          where page.id = source.document_page_id and page.owner_id = old.owner_id
            and question.syllabus_chapter_id = old.chapter_id
            and question.review_status = 'approved'
        )
    ) then
      raise exception 'Every document page source must remain linked to an approved question in this chapter';
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