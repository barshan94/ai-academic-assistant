alter table public.questions
  add column syllabus_version text,
  add column classification_status text not null default 'unreviewed',
  add constraint questions_syllabus_version_length
    check (syllabus_version is null or length(trim(syllabus_version)) between 1 and 80),
  add constraint questions_classification_status_check
    check (classification_status in ('unreviewed', 'confirmed', 'uncertain')),
  add constraint questions_classification_confidence_range
    check (classification_confidence is null or classification_confidence between 0 and 1);

comment on column public.questions.syllabus_version is
  'Explicit syllabus specification/version used for this question classification.';
comment on column public.questions.classification_status is
  'Human review state for syllabus classification; independent from question content review_status.';
