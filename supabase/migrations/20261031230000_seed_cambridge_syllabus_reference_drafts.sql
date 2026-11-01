-- Source-indexed official Cambridge syllabus drafts. These are deliberately
-- not verified or visible to ordinary users until a real curator reviews them.
-- The catalogue guard is bypassed only for this migration's fixed draft seed;
-- application writes remain protected by the normal curator trigger and RLS.
begin;

alter table public.reference_syllabus_catalogs
  disable trigger reference_syllabus_catalog_guard;

insert into public.reference_syllabus_catalogs
  (id, board, qualification, subject, version, effective_from, effective_to,
   source_url, source_title, source_checked_at, status, created_by, verified_by, verified_at, updated_at)
values
  ('a5000000-0000-4000-8000-000000000501', 'Cambridge International', 'Cambridge O Level', 'Physics',
   '2026-2028 (5054, Version 2)', null, null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', null,
   'draft', null, null, null, now());

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000501', '1', 'Motion, forces and energy', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 1 — Motion, forces and energy');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000001', 'a5100000-0000-4000-8000-000000000001', '1.1', 'Physical quantities and measurement techniques', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000001', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.1 — Physical quantities and measurement techniques');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000002', 'a5100000-0000-4000-8000-000000000001', '1.2', 'Motion', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000002', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.2 — Motion');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000003', 'a5100000-0000-4000-8000-000000000001', '1.3', 'Mass and weight', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000003', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.3 — Mass and weight');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000004', 'a5100000-0000-4000-8000-000000000001', '1.4', 'Density', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000004', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.4 — Density');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000005', 'a5100000-0000-4000-8000-000000000001', '1.5.1', 'Balanced and unbalanced forces', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000005', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.1 — Balanced and unbalanced forces');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000006', 'a5100000-0000-4000-8000-000000000001', '1.5.2', 'Friction', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000006', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.2 — Friction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000007', 'a5100000-0000-4000-8000-000000000001', '1.5.3', 'Elastic deformation', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000007', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.3 — Elastic deformation');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000008', 'a5100000-0000-4000-8000-000000000001', '1.5.4', 'Circular motion', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000008', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.4 — Circular motion');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000009', 'a5100000-0000-4000-8000-000000000001', '1.5.5', 'Turning effect of forces', 9);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000009', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.5 — Turning effect of forces');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000010', 'a5100000-0000-4000-8000-000000000001', '1.5.6', 'Centre of gravity', 10);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000010', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.5.6 — Centre of gravity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000011', 'a5100000-0000-4000-8000-000000000001', '1.6', 'Momentum', 11);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000011', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.6 — Momentum');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000012', 'a5100000-0000-4000-8000-000000000001', '1.7.1', 'Energy', 12);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000012', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.7.1 — Energy');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000013', 'a5100000-0000-4000-8000-000000000001', '1.7.2', 'Work', 13);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000013', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.7.2 — Work');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000014', 'a5100000-0000-4000-8000-000000000001', '1.7.3', 'Energy resources', 14);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000014', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.7.3 — Energy resources');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000015', 'a5100000-0000-4000-8000-000000000001', '1.7.4', 'Efficiency', 15);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000015', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.7.4 — Efficiency');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000016', 'a5100000-0000-4000-8000-000000000001', '1.7.5', 'Power', 16);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000016', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.7.5 — Power');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000017', 'a5100000-0000-4000-8000-000000000001', '1.8', 'Pressure', 17);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000001', 'a5300000-0000-4000-8000-000000000017', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.8 — Pressure');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000501', '2', 'Thermal physics', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 2 — Thermal physics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000018', 'a5100000-0000-4000-8000-000000000002', '2.1.1', 'States of matter', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000018', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.1.1 — States of matter');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000019', 'a5100000-0000-4000-8000-000000000002', '2.1.2', 'Particle model', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000019', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.1.2 — Particle model');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000020', 'a5100000-0000-4000-8000-000000000002', '2.2.1', 'Thermal expansion of solids, liquids and gases', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000020', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.2.1 — Thermal expansion of solids, liquids and gases');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000021', 'a5100000-0000-4000-8000-000000000002', '2.2.2', 'Specific heat capacity', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000021', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.2.2 — Specific heat capacity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000022', 'a5100000-0000-4000-8000-000000000002', '2.2.3', 'Melting, boiling and evaporation', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000022', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.2.3 — Melting, boiling and evaporation');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000023', 'a5100000-0000-4000-8000-000000000002', '2.3.1', 'Conduction', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000023', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.3.1 — Conduction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000024', 'a5100000-0000-4000-8000-000000000002', '2.3.2', 'Convection', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000024', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.3.2 — Convection');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000025', 'a5100000-0000-4000-8000-000000000002', '2.3.3', 'Radiation', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000025', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.3.3 — Radiation');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000026', 'a5100000-0000-4000-8000-000000000002', '2.3.4', 'Consequences of thermal energy transfer', 9);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000002', 'a5300000-0000-4000-8000-000000000026', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.3.4 — Consequences of thermal energy transfer');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000501', '3', 'Waves', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 3 — Waves');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000027', 'a5100000-0000-4000-8000-000000000003', '3.1', 'General properties of waves', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000027', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.1 — General properties of waves');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000028', 'a5100000-0000-4000-8000-000000000003', '3.2.1', 'Reflection of light', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000028', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.2.1 — Reflection of light');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000029', 'a5100000-0000-4000-8000-000000000003', '3.2.2', 'Refraction of light', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000029', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.2.2 — Refraction of light');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000030', 'a5100000-0000-4000-8000-000000000003', '3.2.3', 'Thin lenses', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000030', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.2.3 — Thin lenses');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000031', 'a5100000-0000-4000-8000-000000000003', '3.2.4', 'Dispersion of light', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000031', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.2.4 — Dispersion of light');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000032', 'a5100000-0000-4000-8000-000000000003', '3.3', 'Electromagnetic spectrum', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000032', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.3 — Electromagnetic spectrum');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000033', 'a5100000-0000-4000-8000-000000000003', '3.4', 'Sound', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000003', 'a5300000-0000-4000-8000-000000000033', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.4 — Sound');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000501', '4', 'Electricity and magnetism', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 4 — Electricity and magnetism');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000034', 'a5100000-0000-4000-8000-000000000004', '4.1', 'Simple magnetism and magnetic fields', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000034', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.1 — Simple magnetism and magnetic fields');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000035', 'a5100000-0000-4000-8000-000000000004', '4.2.1', 'Electrical charge', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000035', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.2.1 — Electrical charge');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000036', 'a5100000-0000-4000-8000-000000000004', '4.2.2', 'Electrical current', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000036', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.2.2 — Electrical current');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000037', 'a5100000-0000-4000-8000-000000000004', '4.2.3', 'Electromotive force and potential difference', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000037', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.2.3 — Electromotive force and potential difference');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000038', 'a5100000-0000-4000-8000-000000000004', '4.2.4', 'Resistance', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000038', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.2.4 — Resistance');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000039', 'a5100000-0000-4000-8000-000000000004', '4.3.1', 'Circuit diagrams and circuit components', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000039', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.3.1 — Circuit diagrams and circuit components');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000040', 'a5100000-0000-4000-8000-000000000004', '4.3.2', 'Series and parallel circuits', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000040', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.3.2 — Series and parallel circuits');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000041', 'a5100000-0000-4000-8000-000000000004', '4.3.3', 'Action and use of circuit components', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000041', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.3.3 — Action and use of circuit components');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000042', 'a5100000-0000-4000-8000-000000000004', '4.4.1', 'Uses of electricity', 9);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000042', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.4.1 — Uses of electricity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000043', 'a5100000-0000-4000-8000-000000000004', '4.4.2', 'Electrical safety', 10);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000043', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.4.2 — Electrical safety');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000044', 'a5100000-0000-4000-8000-000000000004', '4.5.1', 'Electromagnetic induction', 11);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000044', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.1 — Electromagnetic induction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000045', 'a5100000-0000-4000-8000-000000000004', '4.5.2', 'The a.c. generator', 12);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000045', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.2 — The a.c. generator');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000046', 'a5100000-0000-4000-8000-000000000004', '4.5.3', 'Magnetic effect of a current', 13);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000046', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.3 — Magnetic effect of a current');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000047', 'a5100000-0000-4000-8000-000000000004', '4.5.4', 'Forces on a current-carrying conductor', 14);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000047', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.4 — Forces on a current-carrying conductor');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000048', 'a5100000-0000-4000-8000-000000000004', '4.5.5', 'The d.c. motor', 15);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000048', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.5 — The d.c. motor');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000049', 'a5100000-0000-4000-8000-000000000004', '4.5.6', 'The transformer', 16);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000049', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.5.6 — The transformer');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000050', 'a5100000-0000-4000-8000-000000000004', '4.6', 'Uses of an oscilloscope', 17);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000004', 'a5300000-0000-4000-8000-000000000050', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.6 — Uses of an oscilloscope');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000005', 'a5000000-0000-4000-8000-000000000501', '5', 'Nuclear physics', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 5 — Nuclear physics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000051', 'a5100000-0000-4000-8000-000000000005', '5.1.1', 'The atom', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000051', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.1.1 — The atom');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000052', 'a5100000-0000-4000-8000-000000000005', '5.1.2', 'The nucleus', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000052', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.1.2 — The nucleus');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000053', 'a5100000-0000-4000-8000-000000000005', '5.2.1', 'Detection of radioactivity', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000053', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.1 — Detection of radioactivity');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000054', 'a5100000-0000-4000-8000-000000000005', '5.2.2', 'The three types of emission', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000054', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.2 — The three types of emission');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000055', 'a5100000-0000-4000-8000-000000000005', '5.2.3', 'Radioactive decay', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000055', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.3 — Radioactive decay');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000056', 'a5100000-0000-4000-8000-000000000005', '5.2.4', 'Fission and fusion', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000056', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.4 — Fission and fusion');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000057', 'a5100000-0000-4000-8000-000000000005', '5.2.5', 'Half-life', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000057', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.5 — Half-life');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000058', 'a5100000-0000-4000-8000-000000000005', '5.2.6', 'Safety precautions', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000005', 'a5300000-0000-4000-8000-000000000058', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.2.6 — Safety precautions');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5100000-0000-4000-8000-000000000006', 'a5000000-0000-4000-8000-000000000501', '6', 'Space physics', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', null, 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 6 — Space physics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000059', 'a5100000-0000-4000-8000-000000000006', '6.1.1', 'The Earth', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', 'a5300000-0000-4000-8000-000000000059', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.1.1 — The Earth');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000060', 'a5100000-0000-4000-8000-000000000006', '6.1.2', 'The Solar System', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', 'a5300000-0000-4000-8000-000000000060', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.1.2 — The Solar System');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000061', 'a5100000-0000-4000-8000-000000000006', '6.2.1', 'The Sun as a star', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', 'a5300000-0000-4000-8000-000000000061', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.2.1 — The Sun as a star');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000062', 'a5100000-0000-4000-8000-000000000006', '6.2.2', 'Stars', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', 'a5300000-0000-4000-8000-000000000062', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.2.2 — Stars');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5300000-0000-4000-8000-000000000063', 'a5100000-0000-4000-8000-000000000006', '6.2.3', 'The Universe', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000501', 'a5100000-0000-4000-8000-000000000006', 'a5300000-0000-4000-8000-000000000063', 'https://www.cambridgeinternational.org/Images/697324-2026-2028-syllabus.pdf', 'Cambridge O Level Physics 5054 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.2.3 — The Universe');

insert into public.reference_syllabus_catalogs
  (id, board, qualification, subject, version, effective_from, effective_to,
   source_url, source_title, source_checked_at, status, created_by, verified_by, verified_at, updated_at)
values
  ('a5000000-0000-4000-8000-000000000502', 'Cambridge International', 'Cambridge O Level', 'Chemistry',
   '2026-2028 (5070, Version 1)', null, null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', null,
   'draft', null, null, null, now());

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000502', '1', 'States of matter', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000001', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 1 — States of matter');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000001', 'a5200000-0000-4000-8000-000000000001', '1.1', 'Solids, liquids and gases', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000001', 'a5400000-0000-4000-8000-000000000001', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.1 — Solids, liquids and gases');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000002', 'a5200000-0000-4000-8000-000000000001', '1.2', 'Diffusion', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000001', 'a5400000-0000-4000-8000-000000000002', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 1.2 — Diffusion');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000502', '2', 'Atoms, elements and compounds', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 2 — Atoms, elements and compounds');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000003', 'a5200000-0000-4000-8000-000000000002', '2.1', 'Elements, compounds and mixtures', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000003', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.1 — Elements, compounds and mixtures');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000004', 'a5200000-0000-4000-8000-000000000002', '2.2', 'Atomic structure and the Periodic Table', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000004', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.2 — Atomic structure and the Periodic Table');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000005', 'a5200000-0000-4000-8000-000000000002', '2.3', 'Isotopes', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000005', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.3 — Isotopes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000006', 'a5200000-0000-4000-8000-000000000002', '2.4', 'Ion and ionic bonds', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000006', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.4 — Ion and ionic bonds');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000007', 'a5200000-0000-4000-8000-000000000002', '2.5', 'Simple molecules and covalent bonds', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000007', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.5 — Simple molecules and covalent bonds');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000008', 'a5200000-0000-4000-8000-000000000002', '2.6', 'Giant covalent structures', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000008', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.6 — Giant covalent structures');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000009', 'a5200000-0000-4000-8000-000000000002', '2.7', 'Metallic bonding', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000002', 'a5400000-0000-4000-8000-000000000009', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 2.7 — Metallic bonding');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000502', '3', 'Stoichiometry', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000003', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 3 — Stoichiometry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000010', 'a5200000-0000-4000-8000-000000000003', '3.1', 'Formulae', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000003', 'a5400000-0000-4000-8000-000000000010', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.1 — Formulae');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000011', 'a5200000-0000-4000-8000-000000000003', '3.2', 'Relative masses of atoms and molecules', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000003', 'a5400000-0000-4000-8000-000000000011', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.2 — Relative masses of atoms and molecules');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000012', 'a5200000-0000-4000-8000-000000000003', '3.3', 'The mole and the Avogadro constant', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000003', 'a5400000-0000-4000-8000-000000000012', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 3.3 — The mole and the Avogadro constant');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000502', '4', 'Electrochemistry', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000004', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 4 — Electrochemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000013', 'a5200000-0000-4000-8000-000000000004', '4.1', 'Electrolysis', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000004', 'a5400000-0000-4000-8000-000000000013', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.1 — Electrolysis');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000014', 'a5200000-0000-4000-8000-000000000004', '4.2', 'Hydrogen–oxygen fuel cells', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000004', 'a5400000-0000-4000-8000-000000000014', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 4.2 — Hydrogen–oxygen fuel cells');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000005', 'a5000000-0000-4000-8000-000000000502', '5', 'Chemical energetics', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000005', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 5 — Chemical energetics');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000015', 'a5200000-0000-4000-8000-000000000005', '5.1', 'Exothermic and endothermic reactions', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000005', 'a5400000-0000-4000-8000-000000000015', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 5.1 — Exothermic and endothermic reactions');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000006', 'a5000000-0000-4000-8000-000000000502', '6', 'Chemical reactions', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000006', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 6 — Chemical reactions');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000016', 'a5200000-0000-4000-8000-000000000006', '6.1', 'Physical and chemical changes', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000006', 'a5400000-0000-4000-8000-000000000016', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.1 — Physical and chemical changes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000017', 'a5200000-0000-4000-8000-000000000006', '6.2', 'Rate of reaction', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000006', 'a5400000-0000-4000-8000-000000000017', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.2 — Rate of reaction');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000018', 'a5200000-0000-4000-8000-000000000006', '6.3', 'Reversible reactions and equilibrium', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000006', 'a5400000-0000-4000-8000-000000000018', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.3 — Reversible reactions and equilibrium');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000019', 'a5200000-0000-4000-8000-000000000006', '6.4', 'Redox', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000006', 'a5400000-0000-4000-8000-000000000019', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 6.4 — Redox');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000007', 'a5000000-0000-4000-8000-000000000502', '7', 'Acids, bases and salts', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000007', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 7 — Acids, bases and salts');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000020', 'a5200000-0000-4000-8000-000000000007', '7.1', 'The characteristic properties of acids and bases', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000007', 'a5400000-0000-4000-8000-000000000020', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 7.1 — The characteristic properties of acids and bases');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000021', 'a5200000-0000-4000-8000-000000000007', '7.2', 'Oxides', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000007', 'a5400000-0000-4000-8000-000000000021', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 7.2 — Oxides');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000022', 'a5200000-0000-4000-8000-000000000007', '7.3', 'Preparation of salts', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000007', 'a5400000-0000-4000-8000-000000000022', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 7.3 — Preparation of salts');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000008', 'a5000000-0000-4000-8000-000000000502', '8', 'The Periodic Table', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 8 — The Periodic Table');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000023', 'a5200000-0000-4000-8000-000000000008', '8.1', 'Arrangement of elements', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', 'a5400000-0000-4000-8000-000000000023', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 8.1 — Arrangement of elements');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000024', 'a5200000-0000-4000-8000-000000000008', '8.2', 'Group I properties', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', 'a5400000-0000-4000-8000-000000000024', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 8.2 — Group I properties');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000025', 'a5200000-0000-4000-8000-000000000008', '8.3', 'Group VII properties', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', 'a5400000-0000-4000-8000-000000000025', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 8.3 — Group VII properties');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000026', 'a5200000-0000-4000-8000-000000000008', '8.4', 'Transition elements', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', 'a5400000-0000-4000-8000-000000000026', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 8.4 — Transition elements');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000027', 'a5200000-0000-4000-8000-000000000008', '8.5', 'Noble gases', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000008', 'a5400000-0000-4000-8000-000000000027', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 8.5 — Noble gases');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000009', 'a5000000-0000-4000-8000-000000000502', '9', 'Metals', 9);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 9 — Metals');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000028', 'a5200000-0000-4000-8000-000000000009', '9.1', 'Properties of metals', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000028', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.1 — Properties of metals');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000029', 'a5200000-0000-4000-8000-000000000009', '9.2', 'Uses of metals', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000029', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.2 — Uses of metals');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000030', 'a5200000-0000-4000-8000-000000000009', '9.3', 'Alloys and their properties', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000030', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.3 — Alloys and their properties');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000031', 'a5200000-0000-4000-8000-000000000009', '9.4', 'Reactivity series', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000031', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.4 — Reactivity series');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000032', 'a5200000-0000-4000-8000-000000000009', '9.5', 'Corrosion of metals', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000032', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.5 — Corrosion of metals');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000033', 'a5200000-0000-4000-8000-000000000009', '9.6', 'Extraction of metals', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000009', 'a5400000-0000-4000-8000-000000000033', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 9.6 — Extraction of metals');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000010', 'a5000000-0000-4000-8000-000000000502', '10', 'Chemistry of the environment', 10);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000010', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 10 — Chemistry of the environment');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000034', 'a5200000-0000-4000-8000-000000000010', '10.1', 'Water', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000010', 'a5400000-0000-4000-8000-000000000034', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 10.1 — Water');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000035', 'a5200000-0000-4000-8000-000000000010', '10.2', 'Fertilisers', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000010', 'a5400000-0000-4000-8000-000000000035', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 10.2 — Fertilisers');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000036', 'a5200000-0000-4000-8000-000000000010', '10.3', 'Air quality and climate', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000010', 'a5400000-0000-4000-8000-000000000036', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 10.3 — Air quality and climate');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000011', 'a5000000-0000-4000-8000-000000000502', '11', 'Organic chemistry', 11);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 11 — Organic chemistry');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000037', 'a5200000-0000-4000-8000-000000000011', '11.1', 'Formulae, functional groups and terminology', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000037', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.1 — Formulae, functional groups and terminology');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000038', 'a5200000-0000-4000-8000-000000000011', '11.2', 'Naming organic compounds', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000038', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.2 — Naming organic compounds');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000039', 'a5200000-0000-4000-8000-000000000011', '11.3', 'Fuels', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000039', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.3 — Fuels');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000040', 'a5200000-0000-4000-8000-000000000011', '11.4', 'Alkanes', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000040', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.4 — Alkanes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000041', 'a5200000-0000-4000-8000-000000000011', '11.5', 'Alkenes', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000041', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.5 — Alkenes');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000042', 'a5200000-0000-4000-8000-000000000011', '11.6', 'Alcohols', 6);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000042', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.6 — Alcohols');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000043', 'a5200000-0000-4000-8000-000000000011', '11.7', 'Carboxylic acids', 7);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000043', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.7 — Carboxylic acids');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000044', 'a5200000-0000-4000-8000-000000000011', '11.8', 'Polymers', 8);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000011', 'a5400000-0000-4000-8000-000000000044', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 11.8 — Polymers');

insert into public.reference_syllabus_chapters
  (id, catalog_id, chapter_code, title, sort_order)
values ('a5200000-0000-4000-8000-000000000012', 'a5000000-0000-4000-8000-000000000502', '12', 'Experimental techniques and chemical analysis', 12);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', null, 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, chapter 12 — Experimental techniques and chemical analysis');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000045', 'a5200000-0000-4000-8000-000000000012', '12.1', 'Experimental design', 1);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', 'a5400000-0000-4000-8000-000000000045', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 12.1 — Experimental design');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000046', 'a5200000-0000-4000-8000-000000000012', '12.2', 'Acid–base titrations', 2);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', 'a5400000-0000-4000-8000-000000000046', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 12.2 — Acid–base titrations');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000047', 'a5200000-0000-4000-8000-000000000012', '12.3', 'Chromatography', 3);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', 'a5400000-0000-4000-8000-000000000047', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 12.3 — Chromatography');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000048', 'a5200000-0000-4000-8000-000000000012', '12.4', 'Separation and purification', 4);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', 'a5400000-0000-4000-8000-000000000048', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 12.4 — Separation and purification');

insert into public.reference_syllabus_topics
  (id, chapter_id, topic_code, title, sort_order)
values ('a5400000-0000-4000-8000-000000000049', 'a5200000-0000-4000-8000-000000000012', '12.5', 'Identification of ions and gases', 5);

insert into public.reference_syllabus_evidence
  (catalog_id, chapter_id, topic_id, source_url, source_title, source_locator)
values ('a5000000-0000-4000-8000-000000000502', 'a5200000-0000-4000-8000-000000000012', 'a5400000-0000-4000-8000-000000000049', 'https://www.cambridgeinternational.org/Images/697326-2026-2028-syllabus.pdf', 'Cambridge O Level Chemistry 5070 syllabus for examination in 2026, 2027 and 2028', 'Subject content, section 12.5 — Identification of ions and gases');

alter table public.reference_syllabus_catalogs
  enable trigger reference_syllabus_catalog_guard;

commit;
