create table public.question_classification_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated')),
  previous_state jsonb,
  new_state jsonb not null,
  changed_at timestamptz not null default now(),
  constraint question_classification_history_question_owner_fk
    foreign key (question_id, owner_id)
    references public.questions(id, owner_id) on delete cascade
);

create index question_classification_history_owner_question_changed_idx
  on public.question_classification_history(owner_id, question_id, changed_at desc);

alter table public.question_classification_history enable row level security;

create policy question_classification_history_owner_select
  on public.question_classification_history
  for select to authenticated
  using ((select auth.uid()) = owner_id);

grant select on public.question_classification_history to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.question_classification_history from anon, authenticated;
revoke all on public.question_classification_history from anon;

create or replace function public.capture_question_classification_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_state jsonb;
  after_state jsonb;
  actor_id uuid;
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    return new;
  end if;
  if actor_id <> new.owner_id then
    raise exception 'Only the question owner may change its classification';
  end if;

  after_state := jsonb_build_object(
    'board', new.board,
    'qualification', new.qualification,
    'subject', new.subject,
    'syllabus_version', new.syllabus_version,
    'chapter', new.chapter,
    'topic', new.topic,
    'syllabus_catalog_id', new.syllabus_catalog_id,
    'syllabus_chapter_id', new.syllabus_chapter_id,
    'syllabus_topic_id', new.syllabus_topic_id,
    'classification_status', new.classification_status,
    'classification_confidence', new.classification_confidence
  );

  if tg_op = 'UPDATE' then
    before_state := jsonb_build_object(
      'board', old.board,
      'qualification', old.qualification,
      'subject', old.subject,
      'syllabus_version', old.syllabus_version,
      'chapter', old.chapter,
      'topic', old.topic,
      'syllabus_catalog_id', old.syllabus_catalog_id,
      'syllabus_chapter_id', old.syllabus_chapter_id,
      'syllabus_topic_id', old.syllabus_topic_id,
      'classification_status', old.classification_status,
      'classification_confidence', old.classification_confidence
    );
    if before_state = after_state then
      return new;
    end if;
  end if;

  insert into public.question_classification_history (
    question_id, owner_id, changed_by, event_type, previous_state, new_state
  ) values (
    new.id, new.owner_id, actor_id,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    before_state, after_state
  );
  return new;
end;
$$;

revoke all on function public.capture_question_classification_history() from public, anon, authenticated;

create trigger questions_capture_classification_history
after insert or update of
  board, qualification, subject, syllabus_version, chapter, topic,
  syllabus_catalog_id, syllabus_chapter_id, syllabus_topic_id,
  classification_status, classification_confidence
on public.questions
for each row execute function public.capture_question_classification_history();

comment on table public.question_classification_history is
  'Append-only owner-visible snapshots of question syllabus classification changes. Rows are written only by a database trigger.';
