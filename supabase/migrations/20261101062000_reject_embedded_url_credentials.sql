alter table public.question_solution_mark_schemes
  drop constraint question_solution_mark_schemes_source_url_https_host,
  add constraint question_solution_mark_schemes_source_url_https_host
    check (source_url ~* '^https://[^@[:space:]/?#]+([/?#][^[:space:]]*)?$');

alter table public.question_web_research_sources
  add constraint question_web_research_sources_source_url_no_userinfo
    check (source_url ~* '^https://[^@[:space:]/?#]+([/?#][^[:space:]]*)?$');
