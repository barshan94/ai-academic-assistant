create table public.syllabus_reference_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  catalog_id uuid not null,
  chapter_id uuid not null,
  topic_id uuid,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null check (length(trim(source_title)) between 1 and 200),
  source_locator text check (source_locator is null or length(trim(source_locator)) <= 200),
  evidence_excerpt text check (evidence_excerpt is null or length(trim(evidence_excerpt)) <= 600),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint syllabus_reference_evidence_catalog_owner_fk
    foreign key (catalog_id, owner_id)
    references public.syllabus_catalogs(id, owner_id) on delete cascade,
  constraint syllabus_reference_evidence_chapter_catalog_fk
    foreign key (chapter_id, catalog_id)
    references public.syllabus_chapters(id, catalog_id) on delete cascade,
  constraint syllabus_reference_evidence_topic_chapter_fk
    foreign key (topic_id, chapter_id)
    references public.syllabus_topics(id, chapter_id) on delete cascade
);

create index syllabus_reference_evidence_owner_catalog_chapter_idx
  on public.syllabus_reference_evidence(owner_id, catalog_id, chapter_id, topic_id, created_at desc);

alter table public.syllabus_reference_evidence enable row level security;

create policy syllabus_reference_evidence_owner_select
  on public.syllabus_reference_evidence for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy syllabus_reference_evidence_owner_insert
  on public.syllabus_reference_evidence for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select auth.uid()) = created_by
  );

grant select on public.syllabus_reference_evidence to authenticated;
grant insert (
  catalog_id, chapter_id, topic_id, source_url, source_title,
  source_locator, evidence_excerpt
) on public.syllabus_reference_evidence to authenticated;
revoke update, delete, truncate, references, trigger
  on public.syllabus_reference_evidence from anon, authenticated;
revoke all on public.syllabus_reference_evidence from anon;

create or replace function public.require_syllabus_mapping_evidence()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_catalog_status text;
  has_evidence boolean;
begin
  if new.classification_status <> 'confirmed' or new.syllabus_catalog_id is null then
    return new;
  end if;

  select c.status into selected_catalog_status
  from public.syllabus_catalogs c
  where c.id = new.syllabus_catalog_id and c.owner_id = new.owner_id;

  if selected_catalog_status is distinct from 'verified' then
    raise exception 'A structured classification requires a verified syllabus catalogue'
      using errcode = '23514';
  end if;

  if new.syllabus_chapter_id is null then
    raise exception 'A structured classification requires a chapter reference'
      using errcode = '23514';
  end if;

  if new.syllabus_topic_id is null then
    select exists (
      select 1 from public.syllabus_reference_evidence e
      where e.owner_id = new.owner_id
        and e.catalog_id = new.syllabus_catalog_id
        and e.chapter_id = new.syllabus_chapter_id
        and e.topic_id is null
    ) into has_evidence;
  else
    select exists (
      select 1 from public.syllabus_reference_evidence e
      where e.owner_id = new.owner_id
        and e.catalog_id = new.syllabus_catalog_id
        and e.chapter_id = new.syllabus_chapter_id
        and e.topic_id = new.syllabus_topic_id
    ) into has_evidence;
  end if;

  if not has_evidence then
    raise exception 'Record source evidence for the selected chapter or topic before confirming this mapping'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger questions_require_syllabus_mapping_evidence
before insert or update of
  classification_status, syllabus_catalog_id, syllabus_chapter_id, syllabus_topic_id
on public.questions
for each row execute function public.require_syllabus_mapping_evidence();

revoke all on function public.require_syllabus_mapping_evidence() from public, anon, authenticated;

comment on table public.syllabus_reference_evidence is
  'Append-only owner-recorded source citations for syllabus chapters and topics. A citation is not independently certified by the application.';
comment on function public.require_syllabus_mapping_evidence() is
  'Prevents a structured question mapping from being marked confirmed until owner-recorded source evidence exists for its selected chapter or topic.';
