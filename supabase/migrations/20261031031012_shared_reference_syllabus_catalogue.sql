-- Shared, centrally curated syllabus references. Ordinary users may read only
-- verified catalogues; platform-admin membership is provisioned out of band.

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.reference_syllabus_catalogs (
  id uuid primary key default gen_random_uuid(),
  board text not null check (length(trim(board)) between 1 and 100),
  qualification text not null check (length(trim(qualification)) between 1 and 100),
  subject text not null check (length(trim(subject)) between 1 and 120),
  version text not null check (length(trim(version)) between 1 and 80),
  effective_from date,
  effective_to date,
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_title text check (source_title is null or length(trim(source_title)) between 1 and 200),
  source_checked_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'verified', 'retired')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id),
  check (effective_from is null or effective_to is null or effective_to >= effective_from),
  check (
    (status = 'verified' and verified_by is not null and verified_at is not null)
    or status <> 'verified'
  )
);

create unique index reference_syllabus_catalog_identity_idx
  on public.reference_syllabus_catalogs
  (lower(board), lower(qualification), lower(subject), lower(version));
create index reference_syllabus_catalog_status_idx
  on public.reference_syllabus_catalogs (status, board, qualification, subject);

create table public.reference_syllabus_chapters (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.reference_syllabus_catalogs(id) on delete restrict,
  chapter_code text check (chapter_code is null or length(trim(chapter_code)) <= 40),
  title text not null check (length(trim(title)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, catalog_id)
);
create unique index reference_syllabus_chapter_title_idx
  on public.reference_syllabus_chapters (catalog_id, lower(title));
create index reference_syllabus_chapter_order_idx
  on public.reference_syllabus_chapters (catalog_id, sort_order, title);

create table public.reference_syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.reference_syllabus_chapters(id) on delete restrict,
  topic_code text check (topic_code is null or length(trim(topic_code)) <= 40),
  title text not null check (length(trim(title)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, chapter_id)
);
create unique index reference_syllabus_topic_title_idx
  on public.reference_syllabus_topics (chapter_id, lower(title));
create index reference_syllabus_topic_order_idx
  on public.reference_syllabus_topics (chapter_id, sort_order, title);

create table public.reference_syllabus_evidence (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.reference_syllabus_catalogs(id) on delete restrict,
  chapter_id uuid not null,
  topic_id uuid,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null check (length(trim(source_title)) between 1 and 200),
  source_locator text check (source_locator is null or length(trim(source_locator)) <= 200),
  evidence_excerpt text check (evidence_excerpt is null or length(trim(evidence_excerpt)) <= 600),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (chapter_id, catalog_id)
    references public.reference_syllabus_chapters(id, catalog_id) on delete restrict,
  foreign key (topic_id, chapter_id)
    references public.reference_syllabus_topics(id, chapter_id) on delete restrict,
  check (topic_id is null or chapter_id is not null)
);
create index reference_syllabus_evidence_catalog_idx
  on public.reference_syllabus_evidence (catalog_id, created_at desc);
create index reference_syllabus_evidence_chapter_catalog_idx
  on public.reference_syllabus_evidence (chapter_id, catalog_id);
create index reference_syllabus_evidence_topic_chapter_idx
  on public.reference_syllabus_evidence (topic_id, chapter_id)
  where topic_id is not null;
create index reference_syllabus_evidence_created_by_idx
  on public.reference_syllabus_evidence (created_by);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins as admin_membership
    where admin_membership.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;

create or replace function public.guard_reference_syllabus_catalog()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform administrators can manage shared syllabus references';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Shared syllabus catalogues must be created as drafts';
    end if;
    new.created_by := (select auth.uid());
    new.verified_by := null;
    new.verified_at := null;
    new.updated_at := now();
    return new;
  end if;

  if old.status = 'retired' then
    raise exception 'Retired shared syllabus catalogues are immutable';
  end if;

  if old.status = 'verified' then
    if new.status not in ('verified', 'retired') then
      raise exception 'Verified catalogues can only be retired';
    end if;
    if row(
      new.board, new.qualification, new.subject, new.version,
      new.effective_from, new.effective_to, new.source_url,
      new.source_title, new.source_checked_at
    ) is distinct from row(
      old.board, old.qualification, old.subject, old.version,
      old.effective_from, old.effective_to, old.source_url,
      old.source_title, old.source_checked_at
    ) then
      raise exception 'Verified catalogue identity and provenance are immutable; publish a new version';
    end if;
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    return new;
  end if;

  if new.status = 'verified' then
    if new.source_url is null or new.source_title is null or new.source_checked_at is null then
      raise exception 'A verified catalogue requires a checked HTTPS source and source title';
    end if;
    if not exists (
      select 1 from public.reference_syllabus_chapters as chapter
      where chapter.catalog_id = new.id
    ) then
      raise exception 'A verified catalogue must contain at least one chapter';
    end if;
    if exists (
      select 1
      from public.reference_syllabus_chapters as chapter
      where chapter.catalog_id = new.id
        and not exists (
          select 1 from public.reference_syllabus_evidence as evidence
          where evidence.catalog_id = chapter.catalog_id
            and evidence.chapter_id = chapter.id
            and evidence.topic_id is null
        )
    ) then
      raise exception 'Every chapter needs its own source evidence before verification';
    end if;
    if exists (
      select 1
      from public.reference_syllabus_topics as topic
      join public.reference_syllabus_chapters as chapter
        on chapter.id = topic.chapter_id
      where chapter.catalog_id = new.id
        and not exists (
          select 1 from public.reference_syllabus_evidence as evidence
          where evidence.catalog_id = new.id
            and evidence.chapter_id = topic.chapter_id
            and evidence.topic_id = topic.id
        )
    ) then
      raise exception 'Every topic needs its own source evidence before verification';
    end if;
    new.verified_by := (select auth.uid());
    new.verified_at := now();
  end if;

  new.created_by := old.created_by;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reference_syllabus_catalog_guard
before insert or update on public.reference_syllabus_catalogs
for each row execute function public.guard_reference_syllabus_catalog();

create or replace function public.guard_reference_syllabus_structure()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_catalog_id uuid;
  target_status text;
begin
  if tg_table_name = 'reference_syllabus_chapters' then
    if tg_op = 'UPDATE' and new.catalog_id is distinct from old.catalog_id then
      raise exception 'A chapter cannot be moved between shared catalogues';
    end if;
    if tg_op = 'DELETE' then
      target_catalog_id := old.catalog_id;
    else
      target_catalog_id := new.catalog_id;
    end if;
  else
    if tg_op = 'UPDATE' and new.chapter_id is distinct from old.chapter_id then
      raise exception 'A topic cannot be moved between shared chapters';
    end if;
    if tg_op = 'DELETE' then
      select chapter.catalog_id into target_catalog_id
      from public.reference_syllabus_chapters as chapter
      where chapter.id = old.chapter_id;
    else
      select chapter.catalog_id into target_catalog_id
      from public.reference_syllabus_chapters as chapter
      where chapter.id = new.chapter_id;
    end if;
  end if;

  select catalog.status into target_status
  from public.reference_syllabus_catalogs as catalog
  where catalog.id = target_catalog_id;

  if target_status is distinct from 'draft' then
    raise exception 'Shared syllabus structure is editable only while its catalogue is a draft';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger reference_syllabus_chapter_guard
before insert or update or delete on public.reference_syllabus_chapters
for each row execute function public.guard_reference_syllabus_structure();

create trigger reference_syllabus_topic_guard
before insert or update or delete on public.reference_syllabus_topics
for each row execute function public.guard_reference_syllabus_structure();

create or replace function public.reject_reference_syllabus_evidence_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Shared syllabus source evidence is append-only';
end;
$$;

create trigger reference_syllabus_evidence_append_only
before update or delete on public.reference_syllabus_evidence
for each row execute function public.reject_reference_syllabus_evidence_mutation();

alter table public.platform_admins enable row level security;
alter table public.reference_syllabus_catalogs enable row level security;
alter table public.reference_syllabus_chapters enable row level security;
alter table public.reference_syllabus_topics enable row level security;
alter table public.reference_syllabus_evidence enable row level security;

create policy "platform_admins_read_self"
  on public.platform_admins for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "reference_catalogs_read_verified_or_admin"
  on public.reference_syllabus_catalogs for select to authenticated
  using (status = 'verified' or (select public.is_platform_admin()));
create policy "reference_catalogs_admin_insert"
  on public.reference_syllabus_catalogs for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy "reference_catalogs_admin_update"
  on public.reference_syllabus_catalogs for update to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

create policy "reference_chapters_read_verified_or_admin"
  on public.reference_syllabus_chapters for select to authenticated
  using (
    (select public.is_platform_admin())
    or exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'verified'
    )
  );
create policy "reference_chapters_admin_insert_draft"
  on public.reference_syllabus_chapters for insert to authenticated
  with check (
    (select public.is_platform_admin())
    and exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'draft'
    )
  );
create policy "reference_chapters_admin_update_draft"
  on public.reference_syllabus_chapters for update to authenticated
  using (
    (select public.is_platform_admin())
    and exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'draft'
    )
  )
  with check (
    (select public.is_platform_admin())
    and exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'draft'
    )
  );

create policy "reference_topics_read_verified_or_admin"
  on public.reference_syllabus_topics for select to authenticated
  using (
    (select public.is_platform_admin())
    or exists (
      select 1
      from public.reference_syllabus_chapters as chapter
      join public.reference_syllabus_catalogs as catalog on catalog.id = chapter.catalog_id
      where chapter.id = chapter_id and catalog.status = 'verified'
    )
  );
create policy "reference_topics_admin_insert_draft"
  on public.reference_syllabus_topics for insert to authenticated
  with check (
    (select public.is_platform_admin())
    and exists (
      select 1
      from public.reference_syllabus_chapters as chapter
      join public.reference_syllabus_catalogs as catalog on catalog.id = chapter.catalog_id
      where chapter.id = chapter_id and catalog.status = 'draft'
    )
  );
create policy "reference_topics_admin_update_draft"
  on public.reference_syllabus_topics for update to authenticated
  using (
    (select public.is_platform_admin())
    and exists (
      select 1
      from public.reference_syllabus_chapters as chapter
      join public.reference_syllabus_catalogs as catalog on catalog.id = chapter.catalog_id
      where chapter.id = chapter_id and catalog.status = 'draft'
    )
  )
  with check (
    (select public.is_platform_admin())
    and exists (
      select 1
      from public.reference_syllabus_chapters as chapter
      join public.reference_syllabus_catalogs as catalog on catalog.id = chapter.catalog_id
      where chapter.id = chapter_id and catalog.status = 'draft'
    )
  );

create policy "reference_evidence_read_verified_or_admin"
  on public.reference_syllabus_evidence for select to authenticated
  using (
    (select public.is_platform_admin())
    or exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'verified'
    )
  );
create policy "reference_evidence_admin_insert_draft"
  on public.reference_syllabus_evidence for insert to authenticated
  with check (
    (select public.is_platform_admin())
    and exists (
      select 1 from public.reference_syllabus_catalogs as catalog
      where catalog.id = catalog_id and catalog.status = 'draft'
    )
  );

-- New public-schema tables are not exposed automatically by Supabase. Grant only
-- the exact Data API operations required; RLS remains the row-level boundary.
grant select on public.platform_admins to authenticated;
grant select, insert (
  board, qualification, subject, version, effective_from, effective_to,
  source_url, source_title, source_checked_at
), update (
  board, qualification, subject, version, effective_from, effective_to,
  source_url, source_title, source_checked_at, status
) on public.reference_syllabus_catalogs to authenticated;
grant select, insert (catalog_id, chapter_code, title, sort_order),
  update (chapter_code, title, sort_order)
  on public.reference_syllabus_chapters to authenticated;
grant select, insert (chapter_id, topic_code, title, sort_order),
  update (topic_code, title, sort_order)
  on public.reference_syllabus_topics to authenticated;
grant select, insert (
  catalog_id, chapter_id, topic_id, source_url, source_title,
  source_locator, evidence_excerpt
) on public.reference_syllabus_evidence to authenticated;

grant select, insert, update, delete on
  public.platform_admins,
  public.reference_syllabus_catalogs,
  public.reference_syllabus_chapters,
  public.reference_syllabus_topics,
  public.reference_syllabus_evidence
to service_role;

revoke all on public.platform_admins,
  public.reference_syllabus_catalogs,
  public.reference_syllabus_chapters,
  public.reference_syllabus_topics,
  public.reference_syllabus_evidence
from anon;

revoke insert, update, delete on public.platform_admins from authenticated;
revoke delete on public.reference_syllabus_catalogs,
  public.reference_syllabus_chapters,
  public.reference_syllabus_topics,
  public.reference_syllabus_evidence
from authenticated;

comment on table public.platform_admins is
  'Out-of-band platform curator membership. Authenticated users cannot self-promote.';
comment on table public.reference_syllabus_catalogs is
  'Centrally curated syllabus references. Only verified rows are visible to ordinary authenticated users.';
comment on table public.reference_syllabus_evidence is
  'Append-only source citations for every shared syllabus chapter and topic. Verification requires evidence coverage.';
