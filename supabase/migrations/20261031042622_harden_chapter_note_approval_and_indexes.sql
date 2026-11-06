-- Approval is performed only by the note owner. Keep the identity as an
-- immutable audit value without a second auth.users FK that can conflict with
-- owner-account deletion cascading the note itself.
alter table public.chapter_note_versions
  drop constraint chapter_note_versions_approved_by_fkey;
alter table public.chapter_note_versions
  add constraint chapter_note_versions_approval_owner_check
  check (approved_by is null or approved_by = owner_id);

create index chapter_note_versions_approved_by_idx
  on public.chapter_note_versions (approved_by)
  where approved_by is not null;
create index chapter_note_versions_catalog_owner_idx
  on public.chapter_note_versions (catalog_id, owner_id);
create index chapter_note_versions_chapter_catalog_idx
  on public.chapter_note_versions (chapter_id, catalog_id);
create index chapter_note_versions_supersedes_owner_idx
  on public.chapter_note_versions (supersedes_id, owner_id)
  where supersedes_id is not null;

create index chapter_note_sources_document_page_owner_idx
  on public.chapter_note_sources (document_page_id, owner_id)
  where document_page_id is not null;
create index chapter_note_sources_note_version_owner_idx
  on public.chapter_note_sources (note_version_id, owner_id);
create index chapter_note_sources_question_owner_idx
  on public.chapter_note_sources (question_id, owner_id)
  where question_id is not null;
