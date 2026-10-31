-- Persist provenance for explicitly shared source text without storing the text itself.
alter table public.question_solutions
  add column source_context jsonb,
  add constraint question_solutions_source_context_object
    check (source_context is null or (
      jsonb_typeof(source_context) = 'object'
      and source_context ?& array['document_id','document_name','page_number','extraction_method','excerpt_sha256','excerpt_length']
      and (source_context->>'page_number') ~ '^[1-9][0-9]*$'
      and source_context->>'extraction_method' in ('pdf_text','ocr','manual')
      and (source_context->>'excerpt_sha256') ~ '^[a-f0-9]{64}$'
      and (source_context->>'excerpt_length') ~ '^[1-9][0-9]*$'
    ));

comment on column public.question_solutions.source_context is
  'Deterministic provenance for owner-opted-in extracted page context. Contains no source text; page excerpt hash and length only.';

-- Preserve least privilege while allowing the server action's owner-scoped insert
-- to record source provenance alongside a generated answer.
revoke insert on table public.question_solutions from public, anon, authenticated;
revoke insert (verification_status) on table public.question_solutions from public, anon, authenticated;
grant insert (owner_id, question_id, provider, model, prompt_version, answer_json, source_context)
  on table public.question_solutions to authenticated;
