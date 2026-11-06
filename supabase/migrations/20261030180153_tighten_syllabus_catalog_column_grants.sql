revoke insert, update, delete on
  public.syllabus_catalogs,
  public.syllabus_chapters,
  public.syllabus_topics
from authenticated;

grant insert (
  owner_id, board, qualification, subject, version,
  effective_from, effective_to, source_url, source_title
) on public.syllabus_catalogs to authenticated;
grant update (status, source_checked_at)
  on public.syllabus_catalogs to authenticated;

grant insert (
  owner_id, catalog_id, chapter_code, title, sort_order
) on public.syllabus_chapters to authenticated;

grant insert (
  owner_id, chapter_id, topic_code, title, sort_order
) on public.syllabus_topics to authenticated;
