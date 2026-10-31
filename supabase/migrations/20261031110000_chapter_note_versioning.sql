-- Versioned, owner-private chapter knowledge. Notes are immutable after creation;
-- a new revision is a new row and approval is an explicit status transition.

create table public.chapter_note_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  catalog_id uuid not null,
  chapter_id uuid not null,
  version_number integer not null check (version_number > 0),
  title text not null check (length(trim(title)) between 1 and 200),
  content_json jsonb not null check (
    jsonb_typeof(content_json) = 'object'
    and octet_length(content_json::text) <= 200000
  ),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'archived')),
  supersedes_id uuid,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (chapter_id, version_number),
  foreign key (catalog_id, owner_id)
    references public.syllabus_catalogs(id, owner_id) on delete restrict,
  foreign key (chapter_id, catalog_id)
    references public.syllabus_chapters(id, catalog_id) on delete restrict,
  foreign key (supersedes_id, owner_id)
    references public.chapter_note_versions(id, owner_id) on delete restrict,
  check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  )
);

create index chapter_note_versions_owner_chapter_idx
  on public.chapter_note_versions (owner_id, chapter_id, version_number desc);
create index chapter_note_versions_catalog_status_idx
  on public.chapter_note_versions (catalog_id, status, chapter_id);

create table public.chapter_note_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  note_version_id uuid not null,
  source_kind text not null check (source_kind in ('question', 'document_page')),
  question_id uuid,
  document_page_id uuid,
  locator text check (locator is null or length(trim(locator)) <= 200),
  created_at timestamptz not null default now(),
  foreign key (note_version_id, owner_id)
    references public.chapter_note_versions(id, owner_id) on delete restrict,
  foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete restrict,
  foreign key (document_page_id, owner_id)
    references public.document_pages(id, owner_id) on delete restrict,
  check (
    (source_kind = 'question' and question_id is not null and document_page_id is null)
    or
    (source_kind = 'document_page' and document_page_id is not null and question_id is null)
  )
);

create unique index chapter_note_sources_question_unique_idx
  on public.chapter_note_sources (note_version_id, question_id)
  where question_id is not null;
create unique index chapter_note_sources_page_unique_idx
  on public.chapter_note_sources (note_version_id, document_page_id)
  where document_page_id is not null;
create index chapter_note_sources_owner_note_idx
  on public.chapter_note_sources (owner_id, note_version_id, created_at);

create or replace function public.guard_chapter_note_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.approved_by is not null or new.approved_at is not null then
      raise exception 'Chapter notes must be created as unapproved drafts';
    end if;
    if new.owner_id <> (select auth.uid()) then
      raise exception 'Chapter note owner must match the authenticated user';
    end if;
    return new;
  end if;

  if row(
    new.owner_id, new.catalog_id, new.chapter_id, new.version_number,
    new.title, new.content_json, new.supersedes_id, new.created_at
  ) is distinct from row(
    old.owner_id, old.catalog_id, old.chapter_id, old.version_number,
    old.title, old.content_json, old.supersedes_id, old.created_at
  ) then
    raise exception 'Chapter note content is immutable; create a new version instead';
  end if;

  if old.status = 'draft' and new.status = 'approved' then
    if not exists (
      select 1 from public.chapter_note_sources as source
      where source.note_version_id = old.id and source.owner_id = old.owner_id
    ) then
      raise exception 'A chapter note needs at least one source before approval';
    end if;
    new.approved_by := (select auth.uid());
    new.approved_at := now();
    return new;
  end if;

  if old.status in ('draft', 'approved') and new.status = 'archived' then
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Invalid chapter note status transition';
  end if;

  new.approved_by := old.approved_by;
  new.approved_at := old.approved_at;
  return new;
end;
$$;

create trigger chapter_note_version_guard
before insert or update on public.chapter_note_versions
for each row execute function public.guard_chapter_note_version();

create or replace function public.guard_chapter_note_source_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id <> (select auth.uid()) then
    raise exception 'Chapter note source owner must match the authenticated user';
  end if;
  if not exists (
    select 1 from public.chapter_note_versions as note
    where note.id = new.note_version_id
      and note.owner_id = new.owner_id
      and note.status = 'draft'
  ) then
    raise exception 'Sources can only be attached to an owned draft note';
  end if;
  return new;
end;
$$;

create trigger chapter_note_source_insert_guard
before insert on public.chapter_note_sources
for each row execute function public.guard_chapter_note_source_insert();

create or replace function public.reject_chapter_note_source_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Chapter note source history is append-only';
end;
$$;

create trigger chapter_note_source_append_only
before update or delete on public.chapter_note_sources
for each row execute function public.reject_chapter_note_source_mutation();

alter table public.chapter_note_versions enable row level security;
alter table public.chapter_note_sources enable row level security;

create policy "chapter_note_versions_owner_select"
  on public.chapter_note_versions for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "chapter_note_versions_owner_insert"
  on public.chapter_note_versions for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "chapter_note_versions_owner_update"
  on public.chapter_note_versions for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "chapter_note_sources_owner_select"
  on public.chapter_note_sources for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "chapter_note_sources_owner_insert"
  on public.chapter_note_sources for insert to authenticated
  with check ((select auth.uid()) = owner_id);

revoke all on public.chapter_note_versions, public.chapter_note_sources from anon, public;
grant select, insert on public.chapter_note_versions to authenticated;
grant update (status) on public.chapter_note_versions to authenticated;
grant select, insert on public.chapter_note_sources to authenticated;
revoke all on function public.guard_chapter_note_version() from public, anon;
revoke all on function public.guard_chapter_note_source_insert() from public, anon;
revoke all on function public.reject_chapter_note_source_mutation() from public, anon;
