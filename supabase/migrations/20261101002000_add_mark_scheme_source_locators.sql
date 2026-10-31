alter table public.question_solution_mark_schemes
  add column source_locator text,
  add column source_document_version text;

alter table public.question_solution_mark_schemes
  add constraint question_solution_mark_schemes_source_locator_length
    check (source_locator is null or length(trim(source_locator)) between 1 and 160),
  add constraint question_solution_mark_schemes_source_document_version_length
    check (source_document_version is null or length(trim(source_document_version)) <= 100);

comment on column public.question_solution_mark_schemes.source_locator is
  'Owner-recorded page, question, section or paragraph locator. NULL is retained only for legacy references created before locator capture was required.';
comment on column public.question_solution_mark_schemes.source_document_version is
  'Optional owner-recorded exam series, specification or publication version; not independently verified.';

create or replace function public.require_mark_scheme_source_locator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_locator is null
    or length(trim(new.source_locator)) not between 1 and 160 then
    raise exception 'A precise mark-scheme source locator is required';
  end if;

  if new.source_document_version is not null
    and length(trim(new.source_document_version)) > 100 then
    raise exception 'Mark-scheme source version is too long';
  end if;

  return new;
end;
$$;

revoke all on function public.require_mark_scheme_source_locator()
  from public, anon, authenticated;

create trigger question_solution_mark_schemes_require_source_locator
  before insert on public.question_solution_mark_schemes
  for each row execute function public.require_mark_scheme_source_locator();
