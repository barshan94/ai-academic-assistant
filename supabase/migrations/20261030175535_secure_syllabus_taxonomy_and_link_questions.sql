alter table public.syllabus_chapters
  add constraint syllabus_chapters_id_owner_unique unique (id, owner_id);

alter table public.syllabus_topics
  add constraint syllabus_topics_chapter_owner_fk
  foreign key (chapter_id, owner_id)
  references public.syllabus_chapters (id, owner_id)
  on delete restrict;

alter table public.questions
  add column syllabus_catalog_id uuid,
  add column syllabus_chapter_id uuid,
  add column syllabus_topic_id uuid,
  add constraint questions_syllabus_catalog_owner_fk
    foreign key (syllabus_catalog_id, owner_id)
    references public.syllabus_catalogs (id, owner_id)
    on delete restrict,
  add constraint questions_syllabus_chapter_catalog_fk
    foreign key (syllabus_chapter_id, syllabus_catalog_id)
    references public.syllabus_chapters (id, catalog_id)
    on delete restrict,
  add constraint questions_syllabus_topic_chapter_fk
    foreign key (syllabus_topic_id, syllabus_chapter_id)
    references public.syllabus_topics (id, chapter_id)
    on delete restrict,
  add constraint questions_syllabus_reference_hierarchy_check
    check (
      (syllabus_catalog_id is not null or syllabus_chapter_id is null)
      and (syllabus_chapter_id is not null or syllabus_topic_id is null)
    );

create index questions_syllabus_catalog_idx
  on public.questions (owner_id, syllabus_catalog_id);
create index questions_syllabus_chapter_idx
  on public.questions (owner_id, syllabus_chapter_id);
create index questions_syllabus_topic_idx
  on public.questions (owner_id, syllabus_topic_id);

alter table public.syllabus_catalogs enable row level security;
alter table public.syllabus_chapters enable row level security;
alter table public.syllabus_topics enable row level security;

create policy "syllabus_catalogs_owner_all"
  on public.syllabus_catalogs for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "syllabus_chapters_owner_all"
  on public.syllabus_chapters for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "syllabus_topics_owner_all"
  on public.syllabus_topics for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

grant select, insert, update on
  public.syllabus_catalogs,
  public.syllabus_chapters,
  public.syllabus_topics
to authenticated;

revoke all on
  public.syllabus_catalogs,
  public.syllabus_chapters,
  public.syllabus_topics
from anon;

revoke delete on
  public.syllabus_catalogs,
  public.syllabus_chapters,
  public.syllabus_topics
from authenticated;
