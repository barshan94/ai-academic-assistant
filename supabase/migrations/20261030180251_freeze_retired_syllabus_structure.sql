drop policy "syllabus_chapters_owner_all" on public.syllabus_chapters;
create policy "syllabus_chapters_owner_all"
  on public.syllabus_chapters for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.syllabus_catalogs c
      where c.id = syllabus_chapters.catalog_id
        and c.owner_id = (select auth.uid())
        and c.status <> 'retired'
    )
  );

drop policy "syllabus_topics_owner_all" on public.syllabus_topics;
create policy "syllabus_topics_owner_all"
  on public.syllabus_topics for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.syllabus_chapters ch
      join public.syllabus_catalogs c
        on c.id = ch.catalog_id and c.owner_id = ch.owner_id
      where ch.id = syllabus_topics.chapter_id
        and ch.owner_id = (select auth.uid())
        and c.status <> 'retired'
    )
  );
