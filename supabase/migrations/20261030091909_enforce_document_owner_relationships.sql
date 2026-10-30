alter table public.documents
  add constraint documents_id_owner_unique unique (id, owner_id);

alter table public.document_pages drop constraint document_pages_document_id_fkey;
alter table public.document_pages add constraint document_pages_document_owner_fk
  foreign key (document_id, owner_id)
  references public.documents(id, owner_id) on delete cascade;

alter table public.processing_jobs drop constraint processing_jobs_document_id_fkey;
alter table public.processing_jobs add constraint processing_jobs_document_owner_fk
  foreign key (document_id, owner_id)
  references public.documents(id, owner_id) on delete cascade;

alter table public.questions drop constraint questions_document_id_fkey;
alter table public.questions add constraint questions_document_owner_fk
  foreign key (document_id, owner_id)
  references public.documents(id, owner_id) on delete cascade;

create index document_pages_document_owner_idx on public.document_pages(document_id, owner_id);
create index processing_jobs_document_owner_idx on public.processing_jobs(document_id, owner_id);
create index questions_document_owner_idx on public.questions(document_id, owner_id);
