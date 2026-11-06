alter table public.questions drop constraint questions_page_owner_fk;
alter table public.questions add constraint questions_page_owner_fk
  foreign key (document_page_id, owner_id)
  references public.document_pages(id, owner_id) on delete cascade;
