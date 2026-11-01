# Supabase migration-history reconciliation

## Snapshot

Read-only comparison performed on 2026-11-01 between the `feature/m3-ai-solver` repository tree and the connected Supabase project's migration ledger. Repository file counts below were refreshed after adding the worker-queue fairness migration; the remote ledger count remains the earlier read-only snapshot and has not been refreshed.

- Repository migration files: **96**
- Remote migration-ledger entries: **53**
- Exact version-and-name matches: **51**
- Remote entries whose version/name does not exactly match a repository filename: **2**
- Repository migration files with no exact remote ledger entry: **45** (43 local-only versions plus the two renamed-version counterparts below)

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
