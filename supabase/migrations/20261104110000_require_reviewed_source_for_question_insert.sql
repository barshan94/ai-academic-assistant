-- Prevent authenticated clients from bypassing the reviewed-document workflow.
-- A question must reference a page from a ready document whose page is complete.
drop policy if exists questions_owner_insert on public.questions;

create policy questions_owner_insert
on public.questions
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and document_page_id is not null
  and exists (
    select 1
    from public.documents d
    join public.document_pages p
      on p.document_id = d.id
     and p.owner_id = d.owner_id
    where d.id = questions.document_id
      and d.owner_id = questions.owner_id
      and d.status = 'ready'
      and p.id = questions.document_page_id
      and p.status = 'complete'
  )
);
