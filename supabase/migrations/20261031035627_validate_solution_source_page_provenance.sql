alter table public.question_solutions
  add constraint question_solutions_source_context_page_id
    check (source_context is null or (source_context->>'page_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

create or replace function public.validate_question_solution_source_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source_context is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.questions as q
    join public.document_pages as p
      on p.id = q.document_page_id
     and p.owner_id = q.owner_id
     and p.document_id = q.document_id
    join public.documents as d
      on d.id = q.document_id
     and d.owner_id = q.owner_id
    where q.id = new.question_id
      and q.owner_id = new.owner_id
      and p.id = (new.source_context->>'page_id')::uuid
      and p.page_number = (new.source_context->>'page_number')::integer
      and p.extraction_method = new.source_context->>'extraction_method'
      and d.id = (new.source_context->>'document_id')::uuid
      and d.file_name = new.source_context->>'document_name'
      and coalesce(length(trim(p.extracted_text)), 0) > 0
    ) then
    raise exception 'SOURCE_CONTEXT_PAGE_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger question_solutions_validate_source_context
before insert on public.question_solutions
for each row
execute function public.validate_question_solution_source_context();

comment on function public.validate_question_solution_source_context() is
  'Validates that saved source provenance refers to the exact page and document linked to the owned question. Runs as invoker; no privilege elevation.';
