-- Pearson Edexcel International GCSE linear 2017 specifications remain current
-- for students starting in September 2026 (see official Pearson update).
-- These are curator-only topic-index drafts, not verified/published catalogues.
begin;
alter table public.reference_syllabus_catalogs
  disable trigger reference_syllabus_catalog_guard;
insert into public.reference_syllabus_catalogs
  (id, board, qualification, subject, version, effective_from, effective_to,
   source_url, source_title, source_checked_at, status, created_by, verified_by, verified_at, updated_at)
values
  ('a5000000-0000-4000-8000-000000000503', 'Pearson Edexcel', 'International GCSE', 'Physics',
   '2017 specification, Issue 4 (September 2024)', null, null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', null,
   'draft', null, null, null, now());

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000503', '1', 'Forces and motion', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000001', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 1 — Forces and motion');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000001', 'a5500000-0000-4000-8000-000000000001', '1(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000001', 'a5700000-0000-4000-8000-000000000001', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 1(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000002', 'a5500000-0000-4000-8000-000000000001', '1(b)', 'Movement and position', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000001', 'a5700000-0000-4000-8000-000000000002', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 1(b) — Movement and position');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000003', 'a5500000-0000-4000-8000-000000000001', '1(c)', 'Forces, movement, shape and momentum', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000001', 'a5700000-0000-4000-8000-000000000003', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 1(c) — Forces, movement, shape and momentum');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000503', '2', 'Electricity', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000002', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 2 — Electricity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000004', 'a5500000-0000-4000-8000-000000000002', '2(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000002', 'a5700000-0000-4000-8000-000000000004', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 2(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000005', 'a5500000-0000-4000-8000-000000000002', '2(b)', 'Mains electricity', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000002', 'a5700000-0000-4000-8000-000000000005', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 2(b) — Mains electricity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000006', 'a5500000-0000-4000-8000-000000000002', '2(c)', 'Energy and voltage in circuits', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000002', 'a5700000-0000-4000-8000-000000000006', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 2(c) — Energy and voltage in circuits');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000007', 'a5500000-0000-4000-8000-000000000002', '2(d)', 'Electric charge', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000002', 'a5700000-0000-4000-8000-000000000007', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 2(d) — Electric charge');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000503', '3', 'Waves', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000003', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 3 — Waves');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000008', 'a5500000-0000-4000-8000-000000000003', '3(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000003', 'a5700000-0000-4000-8000-000000000008', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 3(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000009', 'a5500000-0000-4000-8000-000000000003', '3(b)', 'Properties of waves', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000003', 'a5700000-0000-4000-8000-000000000009', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 3(b) — Properties of waves');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000010', 'a5500000-0000-4000-8000-000000000003', '3(c)', 'The electromagnetic spectrum', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000003', 'a5700000-0000-4000-8000-000000000010', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 3(c) — The electromagnetic spectrum');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000011', 'a5500000-0000-4000-8000-000000000003', '3(d)', 'Light and sound', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000003', 'a5700000-0000-4000-8000-000000000011', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 3(d) — Light and sound');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000503', '4', 'Energy resources and energy transfers', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000004', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 4 — Energy resources and energy transfers');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000012', 'a5500000-0000-4000-8000-000000000004', '4(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000004', 'a5700000-0000-4000-8000-000000000012', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 4(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000013', 'a5500000-0000-4000-8000-000000000004', '4(b)', 'Energy transfers', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000004', 'a5700000-0000-4000-8000-000000000013', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 4(b) — Energy transfers');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000014', 'a5500000-0000-4000-8000-000000000004', '4(c)', 'Work and power', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000004', 'a5700000-0000-4000-8000-000000000014', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 4(c) — Work and power');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000015', 'a5500000-0000-4000-8000-000000000004', '4(d)', 'Energy resources and electricity generation', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000004', 'a5700000-0000-4000-8000-000000000015', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 4(d) — Energy resources and electricity generation');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000005', 'a5000000-0000-4000-8000-000000000503', '5', 'Solids, liquids and gases', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000005', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 5 — Solids, liquids and gases');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000016', 'a5500000-0000-4000-8000-000000000005', '5(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000005', 'a5700000-0000-4000-8000-000000000016', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 5(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000017', 'a5500000-0000-4000-8000-000000000005', '5(b)', 'Density and pressure', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000005', 'a5700000-0000-4000-8000-000000000017', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 5(b) — Density and pressure');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000018', 'a5500000-0000-4000-8000-000000000005', '5(c)', 'Change of state', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000005', 'a5700000-0000-4000-8000-000000000018', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 5(c) — Change of state');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000019', 'a5500000-0000-4000-8000-000000000005', '5(d)', 'Ideal gas molecules', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000005', 'a5700000-0000-4000-8000-000000000019', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 5(d) — Ideal gas molecules');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000006', 'a5000000-0000-4000-8000-000000000503', '6', 'Magnetism and electromagnetism', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000006', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 6 — Magnetism and electromagnetism');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000020', 'a5500000-0000-4000-8000-000000000006', '6(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000006', 'a5700000-0000-4000-8000-000000000020', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 6(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000021', 'a5500000-0000-4000-8000-000000000006', '6(b)', 'Magnetism', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000006', 'a5700000-0000-4000-8000-000000000021', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 6(b) — Magnetism');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000022', 'a5500000-0000-4000-8000-000000000006', '6(c)', 'Electromagnetism', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000006', 'a5700000-0000-4000-8000-000000000022', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 6(c) — Electromagnetism');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000023', 'a5500000-0000-4000-8000-000000000006', '6(d)', 'Electromagnetic induction', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000006', 'a5700000-0000-4000-8000-000000000023', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 6(d) — Electromagnetic induction');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000007', 'a5000000-0000-4000-8000-000000000503', '7', 'Radioactivity and particles', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000007', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 7 — Radioactivity and particles');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000024', 'a5500000-0000-4000-8000-000000000007', '7(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000007', 'a5700000-0000-4000-8000-000000000024', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 7(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000025', 'a5500000-0000-4000-8000-000000000007', '7(b)', 'Radioactivity', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000007', 'a5700000-0000-4000-8000-000000000025', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 7(b) — Radioactivity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000026', 'a5500000-0000-4000-8000-000000000007', '7(c)', 'Fission and fusion', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000007', 'a5700000-0000-4000-8000-000000000026', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 7(c) — Fission and fusion');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5500000-0000-4000-8000-000000000008', 'a5000000-0000-4000-8000-000000000503', '8', 'Astrophysics', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000008', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3: 8 — Astrophysics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000027', 'a5500000-0000-4000-8000-000000000008', '8(a)', 'Units', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000008', 'a5700000-0000-4000-8000-000000000027', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 8(a) — Units');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000028', 'a5500000-0000-4000-8000-000000000008', '8(b)', 'Motion in the universe', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000008', 'a5700000-0000-4000-8000-000000000028', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 8(b) — Motion in the universe');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000029', 'a5500000-0000-4000-8000-000000000008', '8(c)', 'Stellar evolution', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000008', 'a5700000-0000-4000-8000-000000000029', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 8(c) — Stellar evolution');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5700000-0000-4000-8000-000000000030', 'a5500000-0000-4000-8000-000000000008', '8(d)', 'Cosmology', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000503', 'a5500000-0000-4000-8000-000000000008', 'a5700000-0000-4000-8000-000000000030', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Physics/2017/specification-and-sample-assessments/international-gcse-physics-2017-specification.pdf', 'Pearson Edexcel International GCSE in Physics (4PH1), Specification – Issue 4 – September 2024', 'Section 3, topic 8(d) — Cosmology');

insert into public.reference_syllabus_catalogs
  (id, board, qualification, subject, version, effective_from, effective_to,
   source_url, source_title, source_checked_at, status, created_by, verified_by, verified_at, updated_at)
values
  ('a5000000-0000-4000-8000-000000000504', 'Pearson Edexcel', 'International GCSE', 'Chemistry',
   '2017 specification, Issue 3 (September 2024)', null, null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', null,
   'draft', null, null, null, now());

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5600000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000504', '1', 'Principles of chemistry', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3: 1 — Principles of chemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000001', 'a5600000-0000-4000-8000-000000000001', '1(a)', 'States of matter', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000001', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(a) — States of matter');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000002', 'a5600000-0000-4000-8000-000000000001', '1(b)', 'Elements, compounds and mixtures', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000002', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(b) — Elements, compounds and mixtures');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000003', 'a5600000-0000-4000-8000-000000000001', '1(c)', 'Atomic structure', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000003', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(c) — Atomic structure');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000004', 'a5600000-0000-4000-8000-000000000001', '1(d)', 'The Periodic Table', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000004', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(d) — The Periodic Table');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000005', 'a5600000-0000-4000-8000-000000000001', '1(e)', 'Chemical formulae, equations and calculations', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000005', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(e) — Chemical formulae, equations and calculations');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000006', 'a5600000-0000-4000-8000-000000000001', '1(f)', 'Ionic bonding', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000006', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(f) — Ionic bonding');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000007', 'a5600000-0000-4000-8000-000000000001', '1(g)', 'Covalent bonding', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000007', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(g) — Covalent bonding');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000008', 'a5600000-0000-4000-8000-000000000001', '1(h)', 'Metallic bonding', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000008', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(h) — Metallic bonding');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000009', 'a5600000-0000-4000-8000-000000000001', '1(i)', 'Electrolysis', 9);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000001', 'a5800000-0000-4000-8000-000000000009', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 1(i) — Electrolysis');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5600000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000504', '2', 'Inorganic chemistry', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3: 2 — Inorganic chemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000010', 'a5600000-0000-4000-8000-000000000002', '2(a)', 'Group 1 (alkali metals) – lithium, sodium and potassium', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000010', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(a) — Group 1 (alkali metals) – lithium, sodium and potassium');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000011', 'a5600000-0000-4000-8000-000000000002', '2(b)', 'Group 7 (halogens) – chlorine, bromine and iodine', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000011', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(b) — Group 7 (halogens) – chlorine, bromine and iodine');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000012', 'a5600000-0000-4000-8000-000000000002', '2(c)', 'Gases in the atmosphere', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000012', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(c) — Gases in the atmosphere');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000013', 'a5600000-0000-4000-8000-000000000002', '2(d)', 'Reactivity series', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000013', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(d) — Reactivity series');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000014', 'a5600000-0000-4000-8000-000000000002', '2(e)', 'Extraction and uses of metals', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000014', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(e) — Extraction and uses of metals');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000015', 'a5600000-0000-4000-8000-000000000002', '2(f)', 'Acids, alkalis and titrations', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000015', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(f) — Acids, alkalis and titrations');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000016', 'a5600000-0000-4000-8000-000000000002', '2(g)', 'Acids, bases and salt preparations', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000016', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(g) — Acids, bases and salt preparations');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000017', 'a5600000-0000-4000-8000-000000000002', '2(h)', 'Chemical tests', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000002', 'a5800000-0000-4000-8000-000000000017', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 2(h) — Chemical tests');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5600000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000504', '3', 'Physical chemistry', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000003', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3: 3 — Physical chemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000018', 'a5600000-0000-4000-8000-000000000003', '3(a)', 'Energetics', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000003', 'a5800000-0000-4000-8000-000000000018', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 3(a) — Energetics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000019', 'a5600000-0000-4000-8000-000000000003', '3(b)', 'Rates of reaction', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000003', 'a5800000-0000-4000-8000-000000000019', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 3(b) — Rates of reaction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000020', 'a5600000-0000-4000-8000-000000000003', '3(c)', 'Reversible reactions and equilibria', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000003', 'a5800000-0000-4000-8000-000000000020', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 3(c) — Reversible reactions and equilibria');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5600000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000504', '4', 'Organic chemistry', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', null, 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3: 4 — Organic chemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000021', 'a5600000-0000-4000-8000-000000000004', '4(a)', 'Introduction', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000021', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(a) — Introduction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000022', 'a5600000-0000-4000-8000-000000000004', '4(b)', 'Crude oil', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000022', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(b) — Crude oil');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000023', 'a5600000-0000-4000-8000-000000000004', '4(c)', 'Alkanes', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000023', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(c) — Alkanes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000024', 'a5600000-0000-4000-8000-000000000004', '4(d)', 'Alkenes', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000024', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(d) — Alkenes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000025', 'a5600000-0000-4000-8000-000000000004', '4(e)', 'Alcohols', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000025', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(e) — Alcohols');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000026', 'a5600000-0000-4000-8000-000000000004', '4(f)', 'Carboxylic acids', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000026', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(f) — Carboxylic acids');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000027', 'a5600000-0000-4000-8000-000000000004', '4(g)', 'Esters', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000027', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(g) — Esters');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5800000-0000-4000-8000-000000000028', 'a5600000-0000-4000-8000-000000000004', '4(h)', 'Synthetic polymers', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000504', 'a5600000-0000-4000-8000-000000000004', 'a5800000-0000-4000-8000-000000000028', 'https://qualifications.pearson.com/content/dam/pdf/International%20GCSE/Chemistry/2017/specification-and-sample-assessments/international-gcse-chemistry-2017-specification.pdf', 'Pearson Edexcel International GCSE in Chemistry (4CH1), Specification – Issue 3 – September 2024', 'Section 3, topic 4(h) — Synthetic polymers');

alter table public.reference_syllabus_catalogs
  enable trigger reference_syllabus_catalog_guard;
commit;
