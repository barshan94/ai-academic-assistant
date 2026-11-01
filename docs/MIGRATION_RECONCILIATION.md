# Supabase migration-history reconciliation

## Snapshot

Read-only comparison performed on 2026-11-01 between the `feature/m3-ai-solver` repository tree and the connected Supabase project's migration ledger. Repository file counts below were refreshed at commit `c674d90e911f812fa35ee6f9355c86832e521c49`; the remote ledger count remains the earlier read-only snapshot and has not been refreshed.

- Repository migration files: **95**
- Remote migration-ledger entries: **53**
- Exact version-and-name matches: **51**
- Remote entries whose version/name does not exactly match a repository filename: **2**
- Repository migration files with no exact remote ledger entry: **44** (42 local-only versions plus the two renamed-version counterparts below)

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
```

These are not automatically safe to apply. Some may already be represented in the remote schema under a different version, some may be genuinely pending, and some may depend on prior schema state. The actual schema must be inspected before a migration plan is approved.

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
