create or replace function public.import_syllabus_catalog(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_catalog_id uuid;
  chapter_item jsonb;
  topic_item jsonb;
  new_chapter_id uuid;
  chapter_total integer := 0;
  topic_total integer := 0;
  chapter_topics jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(payload) <> 'object'
    or payload->>'formatVersion' <> '1'
    or jsonb_typeof(payload->'catalog') <> 'object'
    or jsonb_typeof(payload->'chapters') <> 'array' then
    raise exception 'Unsupported or invalid syllabus import document';
  end if;

  if jsonb_array_length(payload->'chapters') > 300 then
    raise exception 'A syllabus import may contain at most 300 chapters';
  end if;

  if coalesce(payload #>> '{catalog,source_url}', '') !~ '^https://' then
    raise exception 'An HTTPS source URL is required';
  end if;

  insert into public.syllabus_catalogs (
    owner_id, board, qualification, subject, version,
    effective_from, effective_to, source_url, source_title, status
  ) values (
    (select auth.uid()),
    payload #>> '{catalog,board}',
    payload #>> '{catalog,qualification}',
    payload #>> '{catalog,subject}',
    payload #>> '{catalog,version}',
    nullif(payload #>> '{catalog,effectiveFrom}', '')::date,
    nullif(payload #>> '{catalog,effectiveTo}', '')::date,
    payload #>> '{catalog,sourceUrl}',
    nullif(payload #>> '{catalog,sourceTitle}', ''),
    'draft'
  ) returning id into new_catalog_id;

  for chapter_item in
    select value from jsonb_array_elements(payload->'chapters') as chapter_rows(value)
  loop
    if jsonb_typeof(chapter_item) <> 'object' then
      raise exception 'Each chapter must be an object';
    end if;

    chapter_topics := chapter_item->'topics';
    if chapter_topics is not null and jsonb_typeof(chapter_topics) <> 'array' then
      raise exception 'Chapter topics must be an array';
    end if;
    chapter_topics := coalesce(chapter_topics, '[]'::jsonb);

    if jsonb_array_length(chapter_topics) > 500 then
      raise exception 'A chapter may contain at most 500 topics';
    end if;

    insert into public.syllabus_chapters (
      owner_id, catalog_id, chapter_code, title, sort_order
    ) values (
      (select auth.uid()),
      new_catalog_id,
      nullif(chapter_item->>'code', ''),
      chapter_item->>'title',
      coalesce(nullif(chapter_item->>'sortOrder', '')::integer, 0)
    ) returning id into new_chapter_id;

    chapter_total := chapter_total + 1;

    for topic_item in
      select value from jsonb_array_elements(chapter_topics) as topic_rows(value)
    loop
      if jsonb_typeof(topic_item) <> 'object' then
        raise exception 'Each topic must be an object';
      end if;

      insert into public.syllabus_topics (
        owner_id, chapter_id, topic_code, title, sort_order
      ) values (
        (select auth.uid()),
        new_chapter_id,
        nullif(topic_item->>'code', ''),
        topic_item->>'title',
        coalesce(nullif(topic_item->>'sortOrder', '')::integer, 0)
      );

      topic_total := topic_total + 1;
      if topic_total > 3000 then
        raise exception 'A syllabus import may contain at most 3000 topics';
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'catalogId', new_catalog_id,
    'chaptersImported', chapter_total,
    'topicsImported', topic_total,
    'status', 'draft'
  );
end;
$$;

revoke all on function public.import_syllabus_catalog(jsonb) from public;
revoke all on function public.import_syllabus_catalog(jsonb) from anon;
grant execute on function public.import_syllabus_catalog(jsonb) to authenticated;
