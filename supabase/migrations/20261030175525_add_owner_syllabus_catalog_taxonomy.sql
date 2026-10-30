create table public.syllabus_catalogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board text not null check (length(trim(board)) between 1 and 100),
  qualification text not null check (length(trim(qualification)) between 1 and 100),
  subject text not null check (length(trim(subject)) between 1 and 120),
  version text not null check (length(trim(version)) between 1 and 80),
  effective_from date,
  effective_to date,
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_title text check (source_title is null or length(trim(source_title)) <= 200),
  source_checked_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'verified', 'retired')),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  check (effective_from is null or effective_to is null or effective_to >= effective_from),
  check (status <> 'verified' or (source_url is not null and source_checked_at is not null))
);

create unique index syllabus_catalogs_owner_identity_idx
  on public.syllabus_catalogs (
    owner_id, lower(board), lower(qualification), lower(subject), lower(version)
  );
create index syllabus_catalogs_owner_created_idx
  on public.syllabus_catalogs (owner_id, created_at desc);

create table public.syllabus_chapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  catalog_id uuid not null,
  chapter_code text check (chapter_code is null or length(trim(chapter_code)) <= 40),
  title text not null check (length(trim(title)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, catalog_id),
  foreign key (catalog_id, owner_id)
    references public.syllabus_catalogs(id, owner_id) on delete restrict
);
alter table public.syllabus_chapters
  add constraint syllabus_chapters_id_catalog_unique unique (id, catalog_id);
create unique index syllabus_chapters_catalog_title_idx
  on public.syllabus_chapters (catalog_id, lower(title));
create index syllabus_chapters_catalog_order_idx
  on public.syllabus_chapters (catalog_id, sort_order, title);

create table public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null,
  topic_code text check (topic_code is null or length(trim(topic_code)) <= 40),
  title text not null check (length(trim(title)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, chapter_id),
  foreign key (chapter_id) references public.syllabus_chapters(id) on delete restrict
);
