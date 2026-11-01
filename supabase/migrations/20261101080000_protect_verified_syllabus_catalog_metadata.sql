create or replace function public.protect_verified_syllabus_catalog_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status <> 'draft'
    and (to_jsonb(new) - 'status' - 'updated_at')
      is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Verified or retired syllabus catalog metadata is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_verified_syllabus_catalog_metadata() from public, anon, authenticated;

create trigger syllabus_catalogs_protect_verified_metadata
before update on public.syllabus_catalogs
for each row execute function public.protect_verified_syllabus_catalog_metadata();

create trigger reference_syllabus_catalogs_protect_verified_metadata
before update on public.reference_syllabus_catalogs
for each row execute function public.protect_verified_syllabus_catalog_metadata();
