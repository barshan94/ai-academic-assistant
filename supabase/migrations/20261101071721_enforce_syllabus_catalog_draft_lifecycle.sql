create or replace function public.enforce_syllabus_catalog_draft_for_taxonomy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_reference boolean := tg_table_name like 'reference_syllabus_%';
  v_is_topic boolean := tg_table_name in ('syllabus_topics', 'reference_syllabus_topics');
  v_old_catalog_id uuid;
  v_new_catalog_id uuid;
  v_old_chapter_id uuid;
  v_new_chapter_id uuid;
  v_catalog_id uuid;
  v_catalog_status text;
begin
  if tg_op <> 'INSERT' then
    if v_is_topic then
      v_old_chapter_id := old.chapter_id;
    else
      v_old_catalog_id := old.catalog_id;
    end if;
  end if;

  if tg_op <> 'DELETE' then
    if v_is_topic then
      v_new_chapter_id := new.chapter_id;
    else
      v_new_catalog_id := new.catalog_id;
    end if;
  end if;

  if v_is_topic then
    -- Lock old/new chapter rows in a stable order before resolving their catalog
    -- IDs. This prevents opposite-direction chapter moves from deadlocking.
    if v_is_reference then
      perform 1
      from public.reference_syllabus_chapters
      where id = any(array_remove(array[v_old_chapter_id, v_new_chapter_id], null))
      order by id
      for update;

      if v_old_chapter_id is not null then
        select catalog_id into v_old_catalog_id
        from public.reference_syllabus_chapters
        where id = v_old_chapter_id;
      end if;
      if v_new_chapter_id is not null then
        select catalog_id into v_new_catalog_id
        from public.reference_syllabus_chapters
        where id = v_new_chapter_id;
      end if;
    else
      perform 1
      from public.syllabus_chapters
      where id = any(array_remove(array[v_old_chapter_id, v_new_chapter_id], null))
      order by id
      for update;

      if v_old_chapter_id is not null then
        select catalog_id into v_old_catalog_id
        from public.syllabus_chapters
        where id = v_old_chapter_id;
      end if;
      if v_new_chapter_id is not null then
        select catalog_id into v_new_catalog_id
        from public.syllabus_chapters
        where id = v_new_chapter_id;
      end if;
    end if;

    if (v_old_chapter_id is not null and v_old_catalog_id is null)
      or (v_new_chapter_id is not null and v_new_catalog_id is null) then
      raise exception 'The syllabus chapter for this taxonomy row was not found';
    end if;
  end if;

  -- Lock parent catalog rows in deterministic order. A concurrent transition
  -- from draft to verified/retired must wait for this taxonomy write, or vice versa.
  for v_catalog_id in
    select distinct candidate.catalog_id
    from unnest(array[v_old_catalog_id, v_new_catalog_id]) as candidate(catalog_id)
    where candidate.catalog_id is not null
    order by candidate.catalog_id
  loop
    if v_is_reference then
      select status
      into v_catalog_status
      from public.reference_syllabus_catalogs
      where id = v_catalog_id
      for update;
    else
      select status
      into v_catalog_status
      from public.syllabus_catalogs
      where id = v_catalog_id
      for update;
    end if;

    if not found or v_catalog_status is distinct from 'draft' then
      raise exception 'Syllabus taxonomy can only be changed while its catalog is in draft status';
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_syllabus_catalog_draft_for_taxonomy() from public, anon, authenticated;

create trigger syllabus_chapters_require_draft_catalog
before insert or update or delete on public.syllabus_chapters
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();

create trigger syllabus_topics_require_draft_catalog
before insert or update or delete on public.syllabus_topics
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();

create trigger syllabus_reference_evidence_require_draft_catalog
before insert or update or delete on public.syllabus_reference_evidence
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();

create trigger reference_syllabus_chapters_require_draft_catalog
before insert or update or delete on public.reference_syllabus_chapters
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();

create trigger reference_syllabus_topics_require_draft_catalog
before insert or update or delete on public.reference_syllabus_topics
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();

create trigger reference_syllabus_evidence_require_draft_catalog
before insert or update or delete on public.reference_syllabus_evidence
for each row execute function public.enforce_syllabus_catalog_draft_for_taxonomy();
