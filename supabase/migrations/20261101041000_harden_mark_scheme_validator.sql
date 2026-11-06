-- Make malformed JSON validation null-safe before any JSON array operation.
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

  if jsonb_typeof(new.points) is distinct from 'array' then
    raise exception 'Mark scheme points must be a JSON array';
  end if;
  if jsonb_array_length(new.points) not between 1 and 80 then
    raise exception 'Mark scheme must contain between 1 and 80 mark points';
  end if;

  for v_point in select value from jsonb_array_elements(new.points)
  loop
    if jsonb_typeof(v_point) is distinct from 'object' then
      raise exception 'Each mark point must be an object';
    end if;

    v_point_id := v_point ->> 'id';
    if v_point_id is null or v_point_id <> trim(v_point_id)
      or length(v_point_id) not between 1 and 40 then
      raise exception 'Each mark point requires a valid ID';
    end if;
    if v_point_id = any(v_point_ids) then
      raise exception 'Mark point IDs must be unique';
    end if;
    v_point_ids := array_append(v_point_ids, v_point_id);

    if jsonb_typeof(v_point -> 'description') is distinct from 'string' then
      raise exception 'Each mark point requires a description';
    end if;
    if length(trim(v_point ->> 'description')) not between 1 and 1000 then
      raise exception 'Each mark point description must contain 1 to 1000 characters';
    end if;

    v_phrases := v_point -> 'keyPhrases';
    if jsonb_typeof(v_phrases) is distinct from 'array' then
      raise exception 'Each mark point keyPhrases value must be a JSON array';
    end if;
    if jsonb_array_length(v_phrases) > 12 then
      raise exception 'Each mark point may contain up to 12 key phrases';
    end if;

    for v_phrase in select value from jsonb_array_elements(v_phrases)
    loop
      if jsonb_typeof(v_phrase) is distinct from 'string' then
        raise exception 'Each key phrase must be a string';
      end if;
      if length(trim(v_phrase #>> '{}')) not between 1 and 120 then
        raise exception 'Each key phrase must contain 1 to 120 characters';
      end if;
    end loop;

    if v_point ? 'marks' then
      if jsonb_typeof(v_point -> 'marks') is distinct from 'number' then
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
