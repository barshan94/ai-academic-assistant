create index platform_admins_created_by_idx
  on public.platform_admins (created_by);

create index reference_syllabus_catalogs_created_by_idx
  on public.reference_syllabus_catalogs (created_by);

create index reference_syllabus_catalogs_verified_by_idx
  on public.reference_syllabus_catalogs (verified_by);
