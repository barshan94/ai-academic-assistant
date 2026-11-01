begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select ok(not has_function_privilege('anon', 'public.guard_reference_syllabus_catalog()', 'EXECUTE'), 'anon cannot execute catalogue trigger helper');
select ok(not has_function_privilege('authenticated', 'public.guard_reference_syllabus_catalog()', 'EXECUTE'), 'authenticated cannot execute catalogue trigger helper');
select ok(not has_function_privilege('service_role', 'public.guard_reference_syllabus_catalog()', 'EXECUTE'), 'service_role cannot execute catalogue trigger helper');
select ok(has_function_privilege('postgres', 'public.guard_reference_syllabus_catalog()', 'EXECUTE'), 'postgres retains catalogue trigger helper execution');

select ok(not has_function_privilege('anon', 'public.guard_reference_syllabus_structure()', 'EXECUTE'), 'anon cannot execute structure trigger helper');
select ok(not has_function_privilege('authenticated', 'public.guard_reference_syllabus_structure()', 'EXECUTE'), 'authenticated cannot execute structure trigger helper');
select ok(not has_function_privilege('service_role', 'public.guard_reference_syllabus_structure()', 'EXECUTE'), 'service_role cannot execute structure trigger helper');
select ok(has_function_privilege('postgres', 'public.guard_reference_syllabus_structure()', 'EXECUTE'), 'postgres retains structure trigger helper execution');

select ok(not has_function_privilege('anon', 'public.reject_reference_syllabus_evidence_mutation()', 'EXECUTE'), 'anon cannot execute evidence trigger helper');
select ok(not has_function_privilege('authenticated', 'public.reject_reference_syllabus_evidence_mutation()', 'EXECUTE'), 'authenticated cannot execute evidence trigger helper');
select ok(not has_function_privilege('service_role', 'public.reject_reference_syllabus_evidence_mutation()', 'EXECUTE'), 'service_role cannot execute evidence trigger helper');
select ok(has_function_privilege('postgres', 'public.reject_reference_syllabus_evidence_mutation()', 'EXECUTE'), 'postgres retains evidence trigger helper execution');

select is((select count(*)::integer from pg_trigger where not tgisinternal and tgname in ('reference_syllabus_catalog_guard','reference_syllabus_chapter_guard','reference_syllabus_topic_guard','reference_syllabus_evidence_append_only')), 4, 'all four integrity triggers remain installed');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('guard_reference_syllabus_catalog','guard_reference_syllabus_structure','reject_reference_syllabus_evidence_mutation') and p.prorettype='trigger'::regtype), 3, 'all three protected helpers remain trigger-returning functions');
select ok(not has_function_privilege('anon','public.guard_reference_syllabus_catalog()','EXECUTE') and not has_function_privilege('authenticated','public.guard_reference_syllabus_catalog()','EXECUTE') and not has_function_privilege('anon','public.guard_reference_syllabus_structure()','EXECUTE') and not has_function_privilege('authenticated','public.guard_reference_syllabus_structure()','EXECUTE') and not has_function_privilege('anon','public.reject_reference_syllabus_evidence_mutation()','EXECUTE') and not has_function_privilege('authenticated','public.reject_reference_syllabus_evidence_mutation()','EXECUTE'), 'no API-facing role inherits direct execution through PUBLIC');
select ok(has_function_privilege('postgres','public.guard_reference_syllabus_catalog()','EXECUTE') and has_function_privilege('postgres','public.guard_reference_syllabus_structure()','EXECUTE') and has_function_privilege('postgres','public.reject_reference_syllabus_evidence_mutation()','EXECUTE'), 'postgres can still execute all trigger helpers');

select * from finish();
rollback;
