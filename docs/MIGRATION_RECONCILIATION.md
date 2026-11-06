# Supabase migration-history reconciliation

## Current owner authorization — 2026-11-06

**DO NOT EXECUTE THIS RUNBOOK.** The current owner scope prohibits dispatching migration-reconciliation workflows, modifying the hosted migration ledger, or applying database migrations. Any earlier authorization recorded below is superseded. This document is retained as historical technical evidence only; its procedure and old “ready” decision are not current instructions. Keep the existing hosted schema and migration history unchanged.


## Superseding snapshot — 2026-11-05

The feature branch now contains **102 migration files** and the connected non-production Supabase ledger contains **102 entries**. The additional migration is `20261105020059_index_remaining_foreign_key_columns`, applied to the existing non-production project and mirrored in the repository.

The three previously documented timestamp/name mismatches remain:
- `20261103162903` ↔ `20261103163000`
- `20261104124726` ↔ `20261104100000`
- `20261104125214` ↔ `20261104110000`

Those three pairs were previously verified SQL-equivalent. The history-only repair and full-chain dry-run workflow has **not** been dispatched in this session. No migration-history repair is claimed. No other pending DDL was identified by the earlier read-only inventory; after the new index migration, the hosted ledger includes the new index migration version.

The five child-side FK indexes were created by the new migration. A post-migration catalog query reports zero unindexed public foreign keys, and the Supabase performance advisor no longer reports `unindexed_foreign_keys`.

## Current snapshot — 2026-11-04

This snapshot supersedes the historical 2026-11-01 counts and pending-migration list retained later in this document.

The current feature branch contains **101 migration files**. The connected non-production Supabase project's hosted ledger contains **101 entries**. A fresh read-only comparison found:

- **98 exact version-and-name matches**.
- **3 timestamp/name mismatches** where the hosted SQL statements match the repository migration SQL after removing comments and normalizing whitespace.
- **0 repository migrations missing from the hosted ledger after those three verified history pairs are reconciled**.
- No pending schema DDL was identified by the version/name inventory.

| Hosted ledger entry | Repository migration file | SQL comparison | Required treatment |
|---|---|---|---|
| 20261103162903_restore_invoker_teacher_rpc_wrappers | 20261103163000_restore_invoker_teacher_rpc_wrappers.sql | Normalized SQL identical | Mark hosted version reverted; mark repository version applied |
| 20261104124726_create_question_from_reviewed_page | 20261104100000_create_questions_only_from_reviewed_pages.sql | Normalized SQL identical | Mark hosted version reverted; mark repository version applied |
| 20261104125214_require_reviewed_source_for_question_insert | 20261104110000_require_reviewed_source_for_question_insert.sql | Normalized SQL identical | Mark hosted version reverted; mark repository version applied |

The second pair has a singular/plural naming difference, but the SQL statement content is identical after normalization. All comparisons were read-only. No hosted migration history or schema was changed during this inspection.

The previous two shared-reference timestamp mismatches documented below are no longer present in the current ledger; those entries now match the repository versions exactly. The former 44-pending-migration list is historical and is not the current state.

## Previously reviewed reconciliation procedure — superseded, do not execute

The owner had previously authorized a non-production reconciliation plan. That authorization is superseded by the 2026-11-06 scope above. The steps below are preserved for audit context only; do not dispatch the workflow or execute the script:

1. Use Supabase CLI **2.122.0** and the fixed project ref uqpyzicftxxegajaocxi.
2. Inspect the current remote migration ledger.
3. Repair only the three verified version-history pairs above. Do not rerun their DDL.
4. Run the full migration-chain dry-run to confirm whether any DDL remains pending.
5. Stop after the dry-run unless the resulting plan is reviewed and the explicit APPLY confirmation is supplied.
6. Inspect the final migration ledger.

Run scripts/reconcile-nonprod-supabase-migrations.sh through the manual workflow .github/workflows/reconcile-nonprod-migrations.yml. The script pins the target and CLI version, uses repository Actions secrets without printing them, and requires explicit confirmation before any pending DDL is applied.

**Do not use generic SQL to edit the migration ledger. Do not reset the project, run against production, or selectively apply migrations.** If the dry-run unexpectedly reports pending DDL, stop and investigate rather than applying it.

## Historical snapshot — 2026-11-01

The following inventory is retained as audit history only. At that time the hosted ledger contained 53 entries, and the repository had 44 genuinely pending migrations after two version-history repairs. Subsequent migration applications and history repairs changed that state. The counts and migration list below must not be used as the current execution plan.

The connected project was previously inspected read-only. The earlier checks found a weaker documents.page_count constraint than the intended repository contract and missing server-only registration objects at that historical checkpoint. Those findings were specific to the 2026-11-01 schema snapshot; they must be rechecked against the current schema before making any release-readiness claim.

## Prohibited shortcuts

- Do not run the migration push before reviewing the current dry-run.
- Do not use migration repair without the SQL-equivalence evidence recorded above.
- Do not edit historical migration SQL or fabricate migration-history entries.
- Do not run migrations against production.
- Do not treat a matching migration ledger as proof of complete application-level acceptance; RLS, grants, function behavior, data integrity and two-account isolation still require their own tests.

## Current decision

**NOT AUTHORIZED.** Do not run the reconciliation workflow, repair any hosted migration-history entry, or apply any migration. The three documented pairs remain unchanged. No new hosted ledger or schema mutation is approved.
