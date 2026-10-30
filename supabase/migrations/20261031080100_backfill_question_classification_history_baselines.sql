alter table public.question_classification_history
  drop constraint question_classification_history_event_type_check,
  add constraint question_classification_history_event_type_check
    check (event_type in ('baseline', 'created', 'updated'));

insert into public.question_classification_history (
  question_id, owner_id, changed_by, event_type, previous_state, new_state
)
select
  q.id, q.owner_id, null, 'baseline', null,
  jsonb_build_object(
    'board', q.board,
    'qualification', q.qualification,
    'subject', q.subject,
    'syllabus_version', q.syllabus_version,
    'chapter', q.chapter,
    'topic', q.topic,
    'syllabus_catalog_id', q.syllabus_catalog_id,
    'syllabus_chapter_id', q.syllabus_chapter_id,
    'syllabus_topic_id', q.syllabus_topic_id,
    'classification_status', q.classification_status,
    'classification_confidence', q.classification_confidence
  )
from public.questions q
where not exists (
  select 1 from public.question_classification_history h
  where h.question_id = q.id and h.owner_id = q.owner_id
);
