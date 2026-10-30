create unique index syllabus_topics_chapter_title_idx
  on public.syllabus_topics (chapter_id, lower(title));
