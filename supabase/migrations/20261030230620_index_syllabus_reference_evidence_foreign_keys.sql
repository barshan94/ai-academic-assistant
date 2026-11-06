create index syllabus_reference_evidence_catalog_owner_fk_idx
  on public.syllabus_reference_evidence(catalog_id, owner_id);
create index syllabus_reference_evidence_chapter_catalog_fk_idx
  on public.syllabus_reference_evidence(chapter_id, catalog_id);
create index syllabus_reference_evidence_topic_chapter_fk_idx
  on public.syllabus_reference_evidence(topic_id, chapter_id)
  where topic_id is not null;
create index syllabus_reference_evidence_created_by_fk_idx
  on public.syllabus_reference_evidence(created_by);
create index syllabus_reference_evidence_owner_chapter_created_idx
  on public.syllabus_reference_evidence(owner_id, chapter_id, created_at desc);
