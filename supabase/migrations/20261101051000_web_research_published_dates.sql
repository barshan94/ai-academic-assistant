alter table public.question_web_research_sources
  add column published_at timestamptz,
  add constraint question_web_research_sources_url_length
    check (length(source_url) between 1 and 2048);

comment on column public.question_web_research_sources.published_at is
  'Publisher-provided search-result publication timestamp when supplied; not independently verified.';
