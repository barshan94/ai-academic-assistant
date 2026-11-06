-- Record exactly which approved owner chapter-note versions were included in an AI answer.
alter table public.question_solutions
  add column knowledge_sources jsonb,
  add constraint question_solutions_knowledge_sources_array
    check (knowledge_sources is null or (
      jsonb_typeof(knowledge_sources) = 'array'
      and jsonb_array_length(knowledge_sources) between 1 and 3
    ));

create or replace function public.validate_question_solution_knowledge_sources()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source jsonb;
  v_note_id uuid;
  v_version_number integer;
  v_note_chapter_id uuid;
  v_question_chapter_id uuid;
  v_note_title text;
  v_seen_ids uuid[] := array[]::uuid[];
begin
  if new.knowledge_sources is null then
    return new;
  end if;

  if jsonb_typeof(new.knowledge_sources) is distinct from 'array' then
    raise exception 'Knowledge source provenance must be a JSON array';
  end if;
  if jsonb_array_length(new.knowledge_sources) not between 1 and 3 then
    raise exception 'At most three approved chapter notes may be included';
  end if;

  select q.syllabus_chapter_id
    into v_question_chapter_id
  from public.questions as q
  where q.id = new.question_id
    and q.owner_id = new.owner_id;

  if not found or v_question_chapter_id is null then
    raise exception 'Question must have a confirmed syllabus chapter before knowledge retrieval';
  end if;

  for v_source in select value from jsonb_array_elements(new.knowledge_sources)
  loop
    if jsonb_typeof(v_source) is distinct from 'object'
      or jsonb_typeof(v_source -> 'note_id') is distinct from 'string'
      or jsonb_typeof(v_source -> 'version_number') is distinct from 'number'
      or jsonb_typeof(v_source -> 'title') is distinct from 'string' then
      raise exception 'Invalid chapter-note provenance item';
    end if;

    if (v_source ->> 'note_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_source ->> 'version_number') !~ '^[1-9][0-9]*$'
      or length(trim(v_source ->> 'title')) not between 1 and 200 then
      raise exception 'Invalid chapter-note provenance values';
    end if;

    v_note_id := (v_source ->> 'note_id')::uuid;
    v_version_number := (v_source ->> 'version_number')::integer;
    if v_note_id = any(v_seen_ids) then
      raise exception 'Duplicate chapter-note provenance is not allowed';
    end if;
    v_seen_ids := array_append(v_seen_ids, v_note_id);

    select note.chapter_id, note.version_number, note.title
      into v_note_chapter_id, v_version_number, v_note_title
    from public.chapter_note_versions as note
    where note.id = v_note_id
      and note.owner_id = new.owner_id
      and note.status = 'approved';

    if not found
      or v_note_chapter_id <> v_question_chapter_id
      or v_note_title <> (v_source ->> 'title') then
      raise exception 'Knowledge source must be an approved note for this question chapter';
    end if;

    if v_version_number <> (v_source ->> 'version_number')::integer then
      raise exception 'Chapter-note version provenance does not match the approved source';
    end if;
  end loop;

  return new;
end;
$$;

create trigger question_solutions_validate_knowledge_sources
before insert on public.question_solutions
for each row execute function public.validate_question_solution_knowledge_sources();

revoke all on function public.validate_question_solution_knowledge_sources() from public, anon;

-- The generated-answer insert remains column-scoped; verification state and
-- other protected fields stay outside the client insert grant.
revoke insert on table public.question_solutions from public, anon, authenticated;
revoke insert (verification_status) on table public.question_solutions from public, anon, authenticated;
grant insert (owner_id, question_id, provider, model, prompt_version, answer_json, source_context, knowledge_sources)
  on table public.question_solutions to authenticated;

comment on column public.question_solutions.knowledge_sources is
  'Owner-approved chapter-note IDs, versions and titles used as secondary AI context. The exact immutable source versions are revalidated on insert.';
