alter default privileges in schema public
  revoke all on tables from anon, authenticated;

revoke all privileges on table
  public.profiles,
  public.documents,
  public.document_pages,
  public.processing_jobs,
  public.questions,
  public.drive_connections
from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;

grant select, insert, update, delete on table
  public.documents,
  public.document_pages,
  public.processing_jobs,
  public.questions,
  public.drive_connections
to authenticated;
