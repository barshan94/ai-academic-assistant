# Supabase migration-history reconciliation

## Snapshot

Read-only comparison performed on 2026-11-01 between the `feature/m3-ai-solver` repository tree and the connected Supabase project's migration ledger. Both the repository tree and hosted migration ledger were refreshed in the same read-only session on 2026-11-01.

- Repository migration files: **96**
- Remote migration-ledger entries: **53**
- Exact version-and-name matches: **51**
- Remote entries whose version/name does not exactly match a repository filename: **2**
- Repository migration files with no exact remote ledger entry: **45** (43 genuinely pending versions plus the two renamed-version counterparts below)

This is a migration-history comparison only. It does not prove that the remote schema matches either migration sequence. No migration was applied, repaired, deleted, renamed or otherwise changed during this inspection.

## Version/name mismatches

| Remote ledger entry | Repository migration file | Required treatment |
|---|---|---|
| `20261031031132_shared_reference_syllabus_catalogue` | `20261031031012_shared_reference_syllabus_catalogue.sql` | Inspect the actual schema and migration contents before deciding whether these represent the same applied change |
| `20261031031233_index_shared_reference_syllabus_foreign_keys` | `20261031031212_index_shared_reference_syllabus_foreign_keys.sql` | Inspect the actual schema and migration contents before deciding whether these represent the same applied change |

Do not mark either pair as reconciled merely because the descriptive names match. The timestamp is part of the migration version identity.

## Repository versions absent from the remote ledger snapshot

The following repository migrations did not have exact version entries in the connected project's ledger at the time of inspection:

```text
20261031061000_question_revision_tracking
20261031072000_practice_sets_and_history
20261031083000_weekly_study_calendar
20261031090000_server_side_practice_selection
20261031100000_complete_practice_insights_aggregation
20261031103244_atomic_document_page_replacement
20261031110000_paginated_study_queue
20261031120000_paginated_weekly_calendar
20261031130000_delete_planned_study_sessions
20261031134000_unbounded_practice_question_selection
20261031140000_edit_planned_study_sessions
20261031150000_question_solution_mark_schemes
20261031160000_require_approved_chapter_note_sources
20261031200000_ai_generation_rate_limits
20261031230000_seed_cambridge_syllabus_reference_drafts
20261031235500_seed_edexcel_reference_drafts
20261101002000_add_mark_scheme_source_locators
20261101030000_document_upload_quotas
20261101040000_validate_mark_scheme_provenance_and_points
20261101041000_harden_mark_scheme_validator
20261101050000_question_web_research_sources
20261101051000_web_research_published_dates
20261101060000_question_solution_knowledge_sources
20261101061000_harden_question_knowledge_source_validation
20261101062000_reject_embedded_url_credentials
20261101063000_revoke_knowledge_trigger_execute
20261101064000_web_research_daily_quota
20261101070012_fix_web_research_quota_atomicity
20261101070719_make_document_worker_and_review_transitions_atomic
20261101071057_register_uploaded_document_atomically
20261101071721_enforce_syllabus_catalog_draft_lifecycle
20261101072157_prevent_syllabus_catalog_status_regression
20261101080000_protect_verified_syllabus_catalog_metadata
20261101083000_make_document_failure_transitions_atomic
20261101090000_terminalize_exhausted_stale_document_jobs
20261101093000_make_document_upload_quota_atomic
20261101100000_make_ai_generation_quota_admission_atomic
20261101103000_make_document_job_claim_and_recovery_atomic
20261101110000_make_manual_document_corrections_atomic
20261101120000_enforce_private_syllabus_catalog_lifecycle
20261101130000_restrict_document_registration_rpc
20261101140000_tighten_uploaded_document_page_count
20261101150000_list_claimable_document_jobs
```

These are not automatically safe to apply. Some may already be represented in the remote schema under a different version, some may be genuinely pending, and some may depend on prior schema state. The actual schema must be inspected before a migration plan is approved.


## Fresh connected-schema spot-check — 2026-11-01

A second read-only inspection was performed against the connected `academic-assistant` Supabase project after the repository inventory refresh. No SQL mutation, migration, ledger repair or deployment was performed.

- The remote migration ledger still contains **53 entries**: 51 exact version/name matches and the same two timestamp/name mismatches listed above.
- The remote `public.documents.page_count` check remains `page_count IS NULL OR page_count >= 0`; it does not enforce the repository's 1–50 non-null page-count contract.
- A catalog query found no `public.register_uploaded_document` function in the connected schema. A broader read-only query for public/private document, upload and worker functions also returned no rows.
- A catalog query found 21 public base/partitioned tables and all 21 had RLS enabled. This does not verify policy correctness, effective grants or two-account IDOR behavior.
- The Supabase security advisor returned no findings at the time of inspection. This is not evidence that repository migrations have been applied or that application-level authorization is accepted.
- The performance advisor reported 60 unused-index notices. The application tables currently report zero rows, so these notices are not grounds to drop indexes.

**Interpretation:** the connected project's schema is not at the feature branch's current migration state. In particular, the server-only registration RPC and page-count invariant are not present there. Do not deploy the current application against this schema or attempt to fix it by selectively applying the newest migrations. Reconcile the entire ledger and schema on an explicitly approved isolated target first.

## Required reconciliation procedure

1. Freeze writes to the target while collecting a schema and migration-history snapshot, or use a disposable isolated target. Do not perform this against production.
2. Obtain a fresh database schema dump and the exact remote migration ledger.
3. Compare every migration's SQL effects with the actual schema, including tables, columns, constraints, indexes, triggers, functions, policies, grants and seed data.
4. Resolve the two timestamp/name mismatches individually. Do not edit historical migration files or fabricate migration-history entries.
5. Determine which repository migrations are already represented by schema changes, which are truly pending, and which need a safe forward-only replacement migration.
6. Reconstruct the intended ordered migration chain on a clean isolated database and apply the full chain there.
7. Run all pgTAP, permission, RLS, lifecycle and concurrency acceptance on that isolated database during the separately authorized testing phase.
8. Only after the owner explicitly approves a target and a reviewed migration plan may any hosted migration be applied.

## Prohibited shortcuts

- Do not run `supabase db push` against the connected project before reconciliation.
- Do not use `supabase migration repair` to make the ledger look correct without schema evidence.
- Do not rename or rewrite historical migration files to match a remote timestamp.
- Do not cherry-pick the newest migrations while skipping dependencies.
- Do not apply the feature branch's pending migrations to the connected project as part of implementation.

## Current decision

**Open release blocker.** The repository and connected project's migration ledgers are not aligned. A safe resolution requires a clean isolated database and schema-level comparison. The connected project's migration history was read only; no hosted database changes were made.


## Connected project follow-up snapshot — 2026-11-01

A further read-only inspection of the connected `academic-assistant` project confirmed:

- Organization plan: Free; project status: `ACTIVE_HEALTHY`; PostgreSQL 17.11; region `ap-south-1`.
- `auth.users`, `public.profiles`, `public.documents`, and `public.processing_jobs` each contain zero rows.
- No Storage buckets and no deployed Supabase Edge Functions were returned by the project APIs.
- The public schema contains 21 base tables and 42 policies; all 21 public tables have RLS enabled.
- The two timestamp/name-mismatched migration effects have some positive object-level evidence: all five tables created by the shared-reference-catalogue migration exist, its `is_platform_admin()` function exists, and all three indexes created by the following foreign-key-index migration exist.
- This evidence supports that at least the named objects are present despite the two migration-version mismatches. It does **not** prove that every trigger, policy, grant, constraint, function body or seed-data effect of those migrations matches the repository SQL, and it does not authorize ledger repair.
- The security advisor returned no findings. The performance advisor returned 60 unused-index informational notices; with zero application rows these are not a reason to drop indexes.

The connected project remains unsuitable as a fully accepted integration target until the complete schema/ledger comparison and missing forward migrations are resolved. No hosted SQL or migration history was changed.


## Hosted privilege and function inventory — 2026-11-01

A further read-only catalog audit was run against the connected `academic-assistant` project. This was an inventory, not an authorization acceptance test.

- No direct `anon` table privileges were found in the `public` schema.
- All 21 public base tables have RLS enabled. Authenticated table grants vary by table and are bounded by the listed RLS policies; RLS correctness and cross-account isolation still require two-account tests.
- The connected public schema exposes no views.
- The only public `SECURITY DEFINER` function found was `capture_question_classification_history()`; catalog privilege checks showed execute for `postgres` and `service_role`, but not `anon` or `authenticated`.
- The connected public schema has 42 policies, all assigned to `authenticated`; this does not establish that they match the current repository's full migration chain.
- The managed `storage` schema has its own platform grants and RLS policies. No Storage buckets exist, so application file-storage acceptance remains unperformed.
- The `private` schema exists, but the connected schema does not contain the current server-only document-registration RPC. A private-schema existence check is not proof that expected private functions/tables are present.

**Decision:** no hosted migration or grant change is authorized by this audit. Preserve the connected project as the existing non-production candidate, but do not point the current branch at it until the missing migration chain is reconciled and applied under an explicitly approved plan.


## Detailed shared-reference migration object audit — 2026-11-01

The two mismatched shared-reference migration pairs were inspected again using read-only catalog queries against the connected project.

- All five expected tables exist: `platform_admins`, `reference_syllabus_catalogs`, `reference_syllabus_chapters`, `reference_syllabus_topics`, and `reference_syllabus_evidence`.
- All 13 expected indexes from the two current repository migration files exist, including the three indexes added by the index migration.
- All four expected functions exist: `is_platform_admin()`, `guard_reference_syllabus_catalog()`, `guard_reference_syllabus_structure()`, and `reject_reference_syllabus_evidence_mutation()`.
- All four expected triggers exist: catalogue guard, chapter guard, topic guard, and append-only evidence guard.
- All 12 expected RLS policies exist across those five tables.
- The shared-reference catalogue, chapter, topic and evidence tables currently contain zero rows. The two Cambridge/Edexcel draft-seed migrations are therefore not represented by existing seed rows and remain pending.
- The three trigger-only helper functions are invoker-security trigger functions, not SECURITY DEFINER functions. Their catalog EXECUTE privileges are still inherited from PostgreSQL's default PUBLIC grant (including anon/authenticated). Trigger-returning functions are not directly callable as ordinary PostgREST RPCs, but the grants are unnecessarily broad and should be revoked in a forward-only hardening migration.

**Migration-history consequence:** object-level evidence strongly supports that the two shared-reference schema migrations have already been applied under the old hosted timestamps. It is still not proof that their function bodies, triggers, grants, constraints and seed side-effects are byte-for-byte/effect-for-effect equivalent to the repository versions. Do not execute the two current `CREATE TABLE` migrations against existing tables. A reviewed migration-history repair plan must account for the old ledger entries and the two replacement repository version identifiers without re-running their DDL.

## Reconciled count and current execution plan

- 96 repository migration files.
- 53 hosted migration ledger entries.
- 51 exact version/name matches.
- 2 hosted-only version identifiers corresponding to the two renamed shared-reference migrations.
- 45 repository files lack exact ledger entries: 2 renamed counterparts whose principal objects are present, plus **43 genuinely pending migration versions**.
- The 43 pending versions must be reviewed and applied in chronological order after the two historical version mismatches are reconciled. The two seed migrations are included in this pending set.
- The fresh isolated CI database has already applied the full current 96-file repository chain successfully, with the current pgTAP suite passing. That proves the repository chain can be replayed on a clean database, not that the hosted database is equivalent.

No hosted migration or migration-ledger repair was performed. The target project remains dedicated to non-production reconciliation, as confirmed by the owner; actual hosted migration execution still requires a separately reviewed execution plan and explicit approval.

## Owner authorization and execution-method check — 2026-11-01

The owner explicitly authorized reconciliation of the two migration-history entries and application of the 43 pending migrations to the existing `academic-assistant` non-production project. This authorization does not include resets, the separate `durga-map` project, production deployment or branch merging.

A forward-only fix for ERR-161 has now been committed:

- `20261101160000_revoke_reference_trigger_function_execute.sql` revokes direct EXECUTE from PUBLIC, anon, authenticated and service_role on the three trigger-only shared-reference helper functions.
- `supabase/tests/reference_trigger_function_privileges.test.sql` verifies those effective privileges, PostgreSQL owner execution and the continued presence of all four triggers.
- Isolated migration/pgTAP workflow run `41322904037` passed.

**Hosted execution is not yet performed.** The available connected database interface can apply DDL migrations, but does not expose the Supabase CLI's version-specific `migration repair` operation. The ordinary migration-apply operation also does not accept a repository migration version. Using it for 43 migrations would risk creating a second, timestamp-divergent history rather than reconciling the repository's exact versions. That would recreate the very drift this procedure is meant to eliminate.

Therefore, do not use the generic migration-apply operation or hand-edit `supabase_migrations.schema_migrations` as a shortcut. The remaining safe route is a pinned Supabase CLI session/workflow against this exact project: inspect `supabase migration repair --help` and `supabase db push --help`, repair only the two evidenced old/new version pairs, run a dry-run including out-of-order migrations, then apply the repository's pending chain in chronological order. Re-fetch the ledger and verify the 96 expected repository versions, schema contracts, RLS, grants, triggers, seed counts and advisors afterward. The hosted project remains unchanged as of this note.

## Exact legacy migration statement verification — 2026-11-01

The migration-history comparison was strengthened by reading the stored SQL statement arrays from the two old hosted ledger rows and comparing their PostgreSQL MD5 digests against the exact UTF-8 contents of the corresponding current repository migration files. Both comparisons returned `exact_sql_match = true`:

- Hosted `20261031031132_shared_reference_syllabus_catalogue` exactly matches repository `20261031031012_shared_reference_syllabus_catalogue.sql`.
- Hosted `20261031031233_index_shared_reference_syllabus_foreign_keys` exactly matches repository `20261031031212_index_shared_reference_syllabus_foreign_keys.sql`.

This is stronger than the earlier object inventory: the stored migration SQL itself is byte-for-byte equivalent to the two current repository files. Therefore, the two old ledger versions can be marked reverted and the two repository versions marked applied without rerunning their DDL, subject to using the Supabase CLI's version-aware migration repair operation.

## Current migration state after ERR-161 hardening — 2026-11-01

- Repository migration files: **97** (the prior 96 plus `20261101160000_revoke_reference_trigger_function_execute.sql`).
- Hosted migration ledger before repair: **53** entries.
- Exact original version/name matches: **51**.
- Old hosted entries with exact-SQL repository replacements: **2**.
- Repository versions still to apply after repairing those two pairs: **44** (the prior 43 plus the new ERR-161 privilege-hardening migration).
- New pgTAP file: `supabase/tests/reference_trigger_function_privileges.test.sql`.
- Latest isolated migration/pgTAP CI run `41322904037`: **passed**.

The owner has authorized the non-production migration operation. The hosted database remains unchanged because the available connected interface does not expose version-specific migration repair, and generic migration application cannot preserve the exact repository versions. Do not hand-edit the ledger or apply the DDL using the generic migration tool. Use the pinned Supabase CLI with the two exact repair pairs, dry-run the complete out-of-order chain with `--include-all`, and only then push the ordered migrations.
