create or replace function public.prevent_syllabus_catalog_status_regression()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'A retired syllabus catalog cannot be reactivated';
  end if;

  if old.status = 'verified' and new.status = 'draft' then
    raise exception 'A verified syllabus catalog cannot return to draft status';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_syllabus_catalog_status_regression() from public, anon, authenticated;

create trigger syllabus_catalogs_prevent_status_regression
before update of status on public.syllabus_catalogs
for each row execute function public.prevent_syllabus_catalog_status_regression();

create trigger reference_syllabus_catalogs_prevent_status_regression
before update of status on public.reference_syllabus_catalogs
for each row execute function public.prevent_syllabus_catalog_status_regression();
