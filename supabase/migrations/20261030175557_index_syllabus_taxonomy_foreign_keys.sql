create index if not exists syllabus_chapters_catalog_owner_fk_idx
  on public.syllabus_chapters (catalog_id, owner_id);
create index if not exists syllabus_chapters_owner_fk_idx
  on public.syllabus_chapters (owner_id);

create index if not exists syllabus_topics_chapter_owner_fk_idx
  on public.syllabus_topics (chapter_id, owner_id);
create index if not exists syllabus_topics_owner_fk_idx
  on public.syllabus_topics (owner_id);

create index if not exists questions_syllabus_catalog_owner_fk_idx
  on public.questions (syllabus_catalog_id, owner_id);
create index if not exists questions_syllabus_chapter_catalog_fk_idx
  on public.questions (syllabus_chapter_id, syllabus_catalog_id);
create index if not exists questions_syllabus_topic_chapter_fk_idx
  on public.questions (syllabus_topic_id, syllabus_chapter_id);

alter table public.syllabus_topics
  drop constraint if exists syllabus_topics_chapter_id_fkey;
