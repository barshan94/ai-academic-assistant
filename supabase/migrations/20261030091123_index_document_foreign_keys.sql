create index document_pages_owner_idx on public.document_pages(owner_id);
create index processing_jobs_document_idx on public.processing_jobs(document_id);
create index questions_document_idx on public.questions(document_id);
create index questions_page_owner_idx on public.questions(document_page_id, owner_id);
