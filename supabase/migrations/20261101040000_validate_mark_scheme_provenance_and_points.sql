-- Enforce mark-scheme evidence and point structure even for direct Data API inserts.
alter table public.question_solution_mark_schemes
  add constraint question_solution_mark_schemes_source_url_https_host
    check (source_url ~* '^https://[^[:space:]/?#]+([/?#][^[:space:]]*)?$');

create or replace function private.validate_question_solution_mark_scheme()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_point jsonb;
  v_phrase jsonb;
  v_point_id text;
  v_point_ids text[] := array[]::text[];
  v_marks numeric;
  v_phrases jsonb;
begin
  if new.source_locator is null
    or length(trim(new.source_locator)) not between 1 and 160 then
    raise exception 'A precise mark-scheme source locator is required';
  end if;

  if new.source_document_version is not null
    and length(trim(new.source_document_version)) not between 1 and 100 then
    raise exception 'Mark-scheme source version must contain 1 to 100 characters';
  end if;

  if jsonb_typeof(new.points) <> 'array'
    or jsonb_array_length(new.points) not between 1 and 80 then
    raise exception 'Mark scheme must contain between 1 and 80 mark points';
  end if;

  for v_point in select value from jsonb_array_elements(new.points)
  loop
    if jsonb_typeof(v_point) <> 'object' then
      raise exception 'Each mark point must be an object';
    end if;

    v_point_id := v_point ->> 'id';
    if v_point_id is null or length(trim(v_point_id)) not between 1 and 40 then
      raise exception 'Each mark point requires a valid ID';
    end if;
    if v_point_id = any(v_point_ids) then
      raise exception 'Mark point IDs must be unique';
    end if;
    v_point_ids := array_append(v_point_ids, v_point_id);

    if jsonb_typeof(v_point -> 'description') <> 'string'
      or length(trim(v_point ->> 'description')) not between 1 and 1000 then
      raise exception 'Each mark point requires a description of 1 to 1000 characters';
    end if;

    v_phrases := v_point -> 'keyPhrases';
    if jsonb_typeof(v_phrases) <> 'array'
      or jsonb_array_length(v_phrases) > 12 then
      raise exception 'Each mark point may contain up to 12 key phrases';
    end if;

    for v_phrase in select value from jsonb_array_elements(v_phrases)
    loop
      if jsonb_typeof(v_phrase) <> 'string'
        or length(trim(v_phrase #>> '{}')) not between 1 and 120 then
        raise exception 'Each key phrase must contain 1 to 120 characters';
      end if;
    end loop;

    if v_point ? 'marks' then
      if jsonb_typeof(v_point -> 'marks') <> 'number' then
        raise exception 'Mark values must be integers from 0 to 20';
      end if;
      v_marks := (v_point ->> 'marks')::numeric;
      if v_marks < 0 or v_marks > 20 or trunc(v_marks) <> v_marks then
        raise exception 'Mark values must be integers from 0 to 20';
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.validate_question_solution_mark_scheme()
  from public, anon, authenticated;

create trigger question_solution_mark_schemes_validate_provenance_and_points
  before insert on public.question_solution_mark_schemes
  for each row execute function private.validate_question_solution_mark_scheme();
