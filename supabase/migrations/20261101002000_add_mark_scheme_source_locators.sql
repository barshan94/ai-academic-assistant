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
