## Worker workflow hardening — 2026-11-05

The manual document-worker workflow now validates the response shape rather than treating any HTTP 2xx as successful processing. It distinguishes a completed document (and reports only the bounded page count) from an empty queue/no claimable job, rejects malformed or failed outcomes, and never prints the raw response, internal job ID or error text into GitHub Actions logs. The workflow remains `workflow_dispatch` only; this change does not enable a recurring schedule or prove live worker recovery. A real invocation still requires verified non-production `APP_BASE_URL` and matching `CRON_SECRET` repository secrets, plus live fault-injection acceptance.

# Owner actions required before production

## Release-gate correction — 2026-11-05

- Supabase's current password-security documentation states that built-in leaked-password protection is available on Pro and above. This project is Free by explicit owner constraint; this setting cannot be enabled on the current plan. The security finding remains unresolved. Do not upgrade or claim it is fixed. A Free-compatible application-level mitigation would need implementation, security review and acceptance before this gate can close. Documentation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The workflow `.github/workflows/reconcile-nonprod-migrations.yml` is **not read-only in its default operation**. Its script first changes the hosted migration ledger using `supabase migration repair` for three previously reviewed SQL-equivalent pairs, then runs `supabase db push --dry-run`. The workflow inputs have been renamed to make the history write explicit. Do not dispatch under a read-only assumption. Do not apply pending DDL without reviewing the dry-run output and receiving explicit approval.
- The document-worker workflow remains manual-dispatch only. A recurring schedule is not safe to activate until the shared `APP_BASE_URL` secret is verified to point to the intended environment and the complete worker route/migrations are integrated on the default branch. Do not assume the Preview-target Vercel secrets control the GitHub Actions secret target.
- AI provider setup remains intentionally disabled: no approved provider/model, credential, data-processing terms or spend cap exists. The provider adapter supports OpenAI-compatible Chat Completions; native provider APIs need adapters. No provider or paid usage has been selected on the owner's behalf.
- The latest Vercel/GitHub checks and deployment status must be evaluated on the exact current PR head; older green runs do not validate later documentation/workflow commits.
- No migration repair, pending DDL application, production deployment, PR merge, plan upgrade, credential disclosure or live Drive test was performed as part of this audit.

## Superseding live checkpoint — 2026-11-05 (latest connector verification)

This note supersedes older counts and status statements later in this file.

- The application-code baseline immediately before this documentation-only update was `4e105458bff92365589cdca172c65209dccb5acb`; Foundation, Database authorization, Authenticated browser acceptance and Secret scanning all passed on that SHA. This document update creates a newer PR head, so its own CI must pass before treating the latest head as verified. PR #1 remains open, draft and unmerged.
- The connected non-production database currently has 1 Drive connection, 3 documents, 2 processing jobs (both completed), 3 document pages, 1 ready document and 2 review-required documents. There are no queued, running or failed jobs. Two Drive-backed documents have a stored Drive file ID, SHA-256 and positive original file size.
- These database counts prove stored records and completed OCR jobs, not that a fresh upload interruption/resume was exercised, that original-PDF retrieval was byte-for-byte checked in a live browser, or that OCR was independently graded.
- Vercel reports no runtime error clusters in the last 24 hours. The Hobby plan retains runtime logs for only one hour, so a 24-hour individual log review is unavailable; a recent 30-minute Preview path query returned no log groups. This is not proof that every route was exercised.
- The latest migration inventory is 102 repository files and 102 hosted ledger entries. The three documented SQL-equivalent version/name mismatches remain; the guarded reconciliation workflow has not been dispatched.
- No production deployment, production migration, PR merge, secret decryption or credential change was performed.

**Next safe work:** finish live Google Drive original-PDF and interrupted-upload acceptance, then the remaining Auth, AI, backup/restore, accessibility, academic and privacy gates. The checked-in worker workflow is manual-dispatch only, not a recurring scheduler. Do not call the application production-ready until these gates are evidenced.


## Superseding owner checkpoint — 2026-11-05



### Foreign-key performance remediation — 2026-11-05

The five missing child-side foreign-key indexes were added to the connected non-production Supabase project using migration `20261105020059_index_remaining_foreign_key_columns`. The matching migration file is committed at `supabase/migrations/20261105020059_index_remaining_foreign_key_columns.sql`.

Post-change verification:
- Catalog query reports **0 unindexed foreign keys** across public-schema constraints.
- Supabase performance advisor no longer reports `unindexed_foreign_keys`.
- The advisor still reports unused indexes (expected on this low-volume non-production project); no existing indexes were dropped.
- The new migration appears in the hosted ledger and in the feature-branch migration directory. The three earlier history-only version/name mismatches remain separate and still need the guarded reconciliation workflow.

### Dependency and acceptance-test closure — 2026-11-05

Foundation workflow `41951678974` on commit `189c76f38f3942d4499afd41a592b72a0af7dce8` completed successfully:
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit` including development dependencies: 0 vulnerabilities.
- Lint, TypeScript checks, unit tests, production build and Chromium smoke passed.
- Database authorization workflow `41951678951` passed.
- Authenticated two-account browser acceptance `41951678947` completed successfully.
- Secret scan `41951678957` passed.

ERR-124 is therefore closed for the current lockfile; see `docs/ERR-124_MINIMATCH_REMEDIATION.md`. The earlier 13-moderate aggregate is not reproduced by the current full audit. Do not keep this item as an active vulnerability unless a future audit identifies it again.

The subsequent docs-only commit `77cd13e` has its own CI runs pending at the time this note was written. Do not reuse the older SHA's green checks as proof for the newer SHA; wait for its checks.

### Live verification addendum — 2026-11-05 (Supabase project read-only)

Project `academic-assistant` (`uqpyzicftxxegajaocxi`) remains ACTIVE_HEALTHY, PostgreSQL 17.11, ap-south-1. No database writes were made in this inspection.

- Hosted migration ledger still lists 101 entries, matching the 101 repository migration files by count. The three previously documented timestamp/name mismatches remain the only known history repair work; this tool session did not execute the pinned GitHub workflow, and did not change schema or migration history.
- All 31 public base tables returned by the live inventory have RLS enabled. No anon table SELECT/INSERT grants were found. The four rate-limit tables intentionally have no client table grants and no client RLS policies; they are private counters accessed through controlled server/database functions.
- Fourteen callable public `SECURITY DEFINER` RPCs were inspected from live `pg_proc` definitions. Every one sets an empty search_path, denies anon EXECUTE, checks `auth.uid()`, and scopes its data operations to the caller's owner ID. They remain authenticated-callable by design; do not mechanically convert them to SECURITY INVOKER because they encapsulate operations against tables with deliberately restricted direct grants. Maintain regression coverage for cross-owner denial.
- One trigger-only SECURITY DEFINER function is not executable by anon or authenticated users.
- Supabase security advisor: 4 informational RLS-enabled/no-policy findings (the four private quota tables), 14 authenticated-callable SECURITY DEFINER warnings, and 1 warning for disabled leaked-password protection. The first two categories were reviewed against live grants/function bodies; the leaked-password setting remains an actual release blocker.
- Performance advisor: five unindexed foreign-key findings. A direct catalog query confirmed five missing child-side leading indexes: `practice_set_items(practice_set_id, owner_id)`, `practice_set_items(question_id, owner_id)`, `question_revision_progress(question_id, owner_id)`, `question_solution_mark_schemes(solution_id, owner_id)`, and `question_web_research_sources(question_id, owner_id)`. Existing data volume is currently small, but these should be added in a forward migration and rechecked.
- No Supabase Edge Functions are currently deployed. The document worker is implemented in the Next.js application and GitHub Actions workflow, not as a Supabase Edge Function.
- Latest commit `189c76f38f3942d4499afd41a592b72a0af7dce8`: Foundation and database authorization workflows passed; secret scan passed; two-account authenticated browser acceptance was still running at last check. Do not claim it passed until its final conclusion is success.

**Actions not completed by this inspection:** migration workflow dispatch/history repair, Auth leaked-password setting, live Drive OAuth and upload/OCR/worker round-trip, approved AI provider credentials and grading, isolated backup/restore, manual accessibility and syllabus/answer/privacy reviews, operator assignment, production environment validation. No deployment or release approval is implied.

The latest feature head is `34974141075e1c52df8ba22e29cba8dd230bc6f6`; PR #1 remains draft and unmerged.

**Verified on this exact SHA**
- Foundation `41882329396`: lint, type-checks, production preflight, production-only audit, build and 241 unit tests across 44 files passed.
- Chromium smoke: 10 passed / 2 skipped.
- Isolated database authorization `41882329455`: migration replay and pgTAP suite passed.
- Authenticated owner/teacher acceptance `41882329427`: 2 passed.
- Full-history secret scan `41882329409`: passed.
- Production dependencies audit clean; 13 moderate development-toolchain minimatch findings remain (ERR-124).

**Deployment**
- The latest READY Preview with application code is commit `9d8303d30b506c3833c46d1f9ec9c2527b2e9583`.
- The four commits from that Preview to current head contain only workflow/documentation changes; application source is unchanged.
- The Vercel status check for the current SHA failed with a build-rate-limit response; no deployment exists for the exact current SHA. Production remains on the older `main` commit. Do not interpret the Vercel check as an application build failure.

**Non-production Supabase**
- Latest read-only inventory: 101 repository migration files, 101 hosted ledger entries, 98 exact matches and 3 timestamp/name mismatches with normalized SQL verified equivalent. No pending schema DDL was identified after those three history pairs are reconciled.
- The guarded history-only reconciliation/dry-run workflow remains to be run; no hosted ledger or schema change is claimed.
- Last inspected Auth setting: leaked-password protection disabled. Enable it before any production use.
- Review the 14 authenticated-callable SECURITY DEFINER RPCs and five unindexed foreign keys; do not blindly convert functions or drop unused indexes.

**Owner-controlled release blockers**
1. Run the guarded non-production history-only reconciliation/dry-run and retain its output.
2. Enable Supabase leaked-password protection and recheck Auth settings.
3. Complete live Google Drive OAuth, upload/resume, OCR and actual worker-completion acceptance (a connected-account banner alone is insufficient).
4. Approve an AI provider, model, data-processing terms and spending cap; then run and independently grade the cross-subject golden set.
5. Complete encrypted backup plus isolated restore, including original-password sign-in and Drive-token decryption.
6. Complete accessibility/device, official syllabus, independent answer-quality, privacy/legal and operator-assignment reviews.
7. Resolve ERR-124 safely; do not force a breaking ESLint downgrade.
8. Validate production-only environment variables and deployment configuration, then obtain explicit release approval before merging or deploying.


## Verified live status — 2026-11-04 (read-only)

### GitHub and Vercel

- Feature branch: `feature/m3-ai-solver`, current head `b135a769bb9ee3402b518ec669a556e8728665fb`. This includes a merge of the latest `main` commit into the feature branch; the document-worker workflow was deliberately kept manual-only until production acceptance.
- Latest fully verified feature-code Preview: **READY**, [open preview](https://ai-academic-assistant-6rr20j9vg-barshan-s-team.vercel.app) for commit `4e7208902b30dd422e9fcc07a7808958e0613ce1`. A Preview for the newer merge commit has not yet been confirmed. This is not Production.
- Latest Production deployment: **READY**, from `main` commit `cd3620fad75d343c3d7160257ab044222ce82c7a`. It does not contain the feature-branch implementation.
- Vercel environment inventory: Supabase URL and publishable key exist across environments. Preview-target entries exist for `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI`, and `DRIVE_TOKEN_ENCRYPTION_KEY`.
- The environment-variable inventory was read without decrypting secrets. Entry existence does **not** prove that a secret value is non-empty, valid, or working. No secret values were retrieved or changed.
- No `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER_POOL`, or `BRAVE_SEARCH_API_KEY` entry was found. AI generation and web research therefore remain unconfigured.
- No production-target server credentials were present in the returned project environment inventory. Production must not receive traffic for the feature until its environment is deliberately configured and validated.

### Latest GitHub Actions evidence

- Foundation run [41873195219](https://github.com/barshan94/ai-academic-assistant/actions/runs/41873195219): passed lint, type checks, unit tests, build, Chromium smoke and authenticated document/teacher acceptance.
- Database authorization run [41873195229](https://github.com/barshan94/ai-academic-assistant/actions/runs/41873195229): passed.
- Secret scanning run [41873195288](https://github.com/barshan94/ai-academic-assistant/actions/runs/41873195288): passed.
- The full development dependency audit still reports 13 moderate minimatch/legacy ESLint-chain findings (ERR-124); the production-only audit is clean. ERR-124 remains open.
- Manual document-worker run [41799486679](https://github.com/barshan94/ai-academic-assistant/actions/runs/41799486679) on `main` succeeded and the endpoint returned 2xx. This confirms the configured GitHub secrets and route responded; it does not prove a queued document completed end-to-end. The worker workflow is manual-only for now; do not enable its five-minute schedule until production acceptance.

### Latest live non-production Supabase inspection

- Existing project `academic-assistant` (`uqpyzicftxxegajaocxi`) is ACTIVE_HEALTHY, Free plan, PostgreSQL 17.11, region `ap-south-1`.
- Repository and hosted migration inventories each contain 101 entries: 98 exact version/name matches and three timestamp/name mismatches whose hosted SQL was verified equivalent to the repository SQL. No pending schema DDL was identified after those exact history pairs are reconciled. The history-only repair and dry-run workflow has **not** been dispatched in this session; no hosted migration ledger or schema was changed.
- The guarded workflow `.github/workflows/reconcile-nonprod-migrations.yml` is available on the feature branch. Its default `reconcile-and-dry-run` path repairs only the three documented equivalent history pairs and performs a full dry-run; it does not apply pending DDL unless the separate exact APPLY confirmation is supplied.
- Security advisor currently reports 14 authenticated-callable SECURITY DEFINER functions and one non-callable trigger function. The inspected functions use an empty search path and reference `auth.uid()`; anon EXECUTE is false for all. The 14 authenticated RPCs still require continued owner-authorization review; do not blindly convert them to SECURITY INVOKER because several deliberately encapsulate writes to private tables.
- Four quota tables have RLS enabled, no client policies, and no anon/authenticated table grants. This is the intended private-table boundary for quota counters.
- Supabase Auth leaked-password protection is disabled and must be enabled before production.
- Performance advisor reports five unindexed foreign keys and 47 unused-index notices. Review the five FK indexes; do not drop the unused indexes based only on low-volume development telemetry.

### Remaining owner-controlled release actions

1. Run the existing non-production migration workflow with its default `reconcile-and-dry-run` operation, inspect the output, and retain the artifact/log as release evidence. Do not select apply unless a reviewed dry-run unexpectedly identifies required DDL and the exact non-production target is reconfirmed.
2. Enable Supabase Auth leaked-password protection.
3. Approve an AI provider/model, data-processing terms and a strict usage budget before adding AI credentials. The application supports OpenAI-compatible providers; automatic price/quality optimization is not implemented.
4. Complete live Google Drive OAuth/upload/OCR round-trip and worker acceptance on the isolated preview.
5. Complete encrypted backup plus isolated full restore rehearsal, accessibility/device review, privacy/legal review and official syllabus/answer grading.
6. Only after the release gate is signed off, configure and validate Production-only secrets, create a reviewed release commit, merge the application PR, and deploy that immutable commit.

PR #1 remains draft. Its merge conflict with the one new `main` worker-workflow commit has been resolved on the feature branch; GitHub now reports it mergeable, but required checks are queued. The application PR has not been merged to `main`.\n\nNo secret values were retrieved, copied, rotated, or changed during this inspection.

## 1. Environment and provider setup

### Verified preview configuration — 2026-11-03

Read-only inspection of the Vercel project `ai-academic-assistant` on the Hobby team confirmed that the latest feature-branch deployment for commit `311b3ac2e0abbd950d3c5a732f5e12d60466f4df` is **READY**. The project has no runtime error clusters in the last 24 hours. The preview build being READY does not mean the application integrations are configured or accepted.

The Vercel environment inventory contains only:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, both set for preview, production and development.
- `DRIVE_TOKEN_ENCRYPTION_KEY`, present as a sensitive variable but with an empty value.

The following are absent: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, Google OAuth client ID/secret, and AI provider credentials/model. No secret values were requested, changed or displayed. Do not add credentials until the owner approves the provider, account, budget and data-processing terms. The preview's deployment readiness and process-level health check do not prove Supabase connectivity, database schema readiness, authenticated application functionality, or live provider integrations.

### Latest implementation-branch verification — 2026-11-03

Current feature branch head: `06789234cde6e5093532a797192f8d4d216815da`. The latest application-code baseline remains `086c19c21b20187758330dbbd5053b05cf1535eb`; recent commits are migration-runner hardening, regression tests and operational documentation.

- Earlier code/tooling checkpoint `134faae82e4bbf945e8e19535f39d39eb9106253`: Foundation, Chromium smoke, isolated database authorization and secret scanning all passed. Foundation included lint, application/Playwright type-checks, production environment contract validation, production dependency audit, production build and 207 unit tests across 40 files. Chromium smoke passed 10 tests with 1 skipped; database CI passed 236 pgTAP assertions across 11 SQL files.
- The latest migration-helper code change on `b234a8e9fc855c12a5870b366e894ddad9f65cb8` removes duplicate credential-hardening lines and adds regression assertions. Its foundation/database runs are still in progress; do not treat pending runs as passing.
- Secret scanning passed on current head `0678923`. Current-head foundation and database authorization runs are still in progress. Authenticated two-account acceptance is skipped because dedicated test credentials are absent.
- Full dev-inclusive npm audit still reports 13 moderate findings (ERR-124); production-only audit reports zero. ERR-124 remains open and is not suppressed.

Fresh read-only hosted Supabase inspection on 2026-11-03:
- Existing `academic-assistant` project remains ACTIVE_HEALTHY, PostgreSQL 17.11, Free plan, region `ap-south-1`.
- Hosted migration ledger remains 53 entries; two version/name mismatches remain, with 44 genuinely pending migrations after version-aware reconciliation.
- Hosted `public.documents.page_count` constraint still does not match the branch's intended 1–50 non-null contract.
- Security advisor returned zero findings. Performance advisor returned 60 informational unused-index notices; the project tables are empty, so no indexes were dropped.

Operations-only PR #2 was merged to `main` as `fbca5d21cc6325b43a47ecbd7a5d5f487b7579c4`, exposing the guarded manual migration workflow. It has not been dispatched because `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` repository secrets are not configured. No hosted migration, ledger repair or data mutation has occurred. PR #1 remains draft and unmerged; no application merge or production deployment occurred.

- [ ] Confirm the non-production Vercel deployment target and deploy only after the implementation branch is ready for the testing phase.
- [x] Inventory the existing Supabase organization and projects. Reuse the existing Free-plan `academic-assistant` project as the non-production candidate; do not create another account or project by default.
- [x] Owner confirmed `academic-assistant` as the dedicated non-production reconciliation/testing target; no reset is proposed. `durga-map` remains excluded because it contains existing application data.
- [x] Owner authorized the hosted migration plan on 2026-11-01, including version-aware repair of the two byte-identical renamed migration pairs and application of the 44 pending migrations. This authorization applies only to the existing non-production project; it does not authorize production changes.
- [ ] Execute the approved plan with the pinned Supabase CLI (`2.122.0`) using `scripts/reconcile-nonprod-supabase-migrations.sh`. The script exports credentials through environment variables and no longer places the database password in the CLI process argument list. The connected Supabase interface does not expose version-specific migration repair, so the hosted project remains unchanged until a CLI session is available. Do not substitute generic SQL or migration-apply calls.
  - **Available now:** the operations-only [PR #2](https://github.com/barshan94/ai-academic-assistant/pull/2) was merged to the default branch as `fbca5d21cc6325b43a47ecbd7a5d5f487b7579c4`. The manual GitHub Actions workflow `.github/workflows/reconcile-nonprod-migrations.yml` is now dispatchable. First add repository Actions secrets `SUPABASE_ACCESS_TOKEN` (scoped to this project) and `SUPABASE_DB_PASSWORD`; never send them in chat. Open Actions → Non-production Supabase migration reconciliation → Run workflow on `feature/m3-ai-solver`. Start with `reconcile-and-dry-run`; this repairs only the two previously SQL-verified migration version entries, then prints the pending migration dry-run without applying the 44 pending DDL migrations. Review the output. Only after deciding to apply, run again with `reconcile-and-apply` and type the exact confirmation phrase requested by the workflow. This is a non-production-only operation; it does not deploy the app. The workflow has not yet been dispatched because the two repository secrets are not configured.
- [ ] After the migrations are reconciled, create two disposable confirmed Auth users and configure the documented authenticated E2E secrets/variable; do not use personal or production accounts.
- [ ] Configure the server-side Supabase URL, publishable key and service-role key in the hosting provider. The service-role key must remain server-only.
- [x] Existing Google Cloud project `AI Academic Assistant`, Drive API, OAuth consent configuration, and OAuth Web client `AI Academic Assistant Web` were created. Keep the existing localhost callback and add the current preview callback to Authorized redirect URIs whenever the preview host changes.
- [ ] Confirm Google consent-screen publishing mode and refresh-token lifetime. Store the existing OAuth client ID/secret and a stable 32-byte Drive token-encryption key in the hosting provider's secret store.
- [ ] Select an AI provider/model only after reviewing its data-processing terms, retention, geographic processing, fallback behavior and price. Set an explicit spend limit. Configure both answer and chapter-note tasks only if approved.
- [ ] Keep web search disabled unless its provider, query disclosure and cost are explicitly approved.
- [ ] Run the production-environment preflight only against the isolated deployment after all required variables have been configured. It checks presence/format, not connectivity.

## 2. GitHub Actions and operations

## Latest authenticated acceptance — 2026-11-04

The authenticated two-account GitHub Actions workflow passed on commit `a57337c` (run `41760662311`) and again on the current documentation commit `fe3591f` (run `41761945931`). This confirms the repository Actions variable and the six E2E secrets are configured and that the approved existing non-production Supabase project accepted the owner/teacher browser lifecycle. The current workflow does not require manually supplied `E2E_QUESTION_ID` or `E2E_SOLUTION_ID`; those are not configuration blockers.

Configure repository Actions secrets from the deployment dashboard; never commit their values.

- [ ] APP_BASE_URL: current isolated Vercel preview HTTPS origin `https://ai-academic-assistant-a6sd0wdjq-barshan-s-team.vercel.app`; refresh after a new preview deployment.
- [ ] CRON_SECRET: same strong random secret used by the deployment's worker and readiness endpoints; add it to Vercel and GitHub Actions only when enabling the worker.
- [x] E2E_SUPABASE_URL and E2E_SUPABASE_PUBLISHABLE_KEY: configured for the existing approved non-production project (`uqpyzicftxxegajaocxi`); latest authenticated workflow passed.
- [x] E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD: two different disposable, confirmed test identities are configured; latest two-account acceptance passed.
- [x] E2E question/solution IDs are not manually configured repository secrets; the current authenticated acceptance workflow derives its own test flow from the two disposable owner/teacher accounts.
- [ ] ALERT_WEBHOOK_URL: optional HTTPS webhook, only if approved.
- [ ] Enable authenticated E2E only after the isolated project, migrations and fixtures are ready.
- [x] Merge the operations-only migration runner workflow to the default branch as PR #2; application PR #1 remains draft and unmerged. Other scheduled workflows still require explicit approval and default-branch activation.
- [ ] Assign a named human operator, backup owner and incident contact. Define who responds to worker backlog, quota failures, provider outages, suspected data exposure and key loss.
- [ ] Decide log retention and alert thresholds after collecting a non-production baseline. GitHub Actions notifications are not guaranteed paging.

## 3. Backup and recovery

- [ ] Generate an age key pair on a trusted workstation. Store the private identity separately from encrypted archives and verify that the recovery owner can access it.
- [ ] Run scripts/backup-supabase.sh against the isolated project; it now requires the Supabase CLI, psql and age. Do not put the database URL in shell history or command-line arguments.
- [ ] Run scripts/verify-backup.sh with the separately stored age identity.
- [ ] Copy the encrypted archive to two independent locations and record archive date, project reference, CLI version and checksum evidence without recording secrets.
- [ ] Rehearse roles/schema restore on a dedicated otherwise-empty target, then run scripts/restore-auth-users.mjs against the target Auth Admin API, then restore application data so original Auth UUID foreign keys resolve. Existing matching UUID/email accounts are skipped to support interrupted imports; their password hashes are not compared.
- [ ] Confirm the target Auth project uses the same password-hashing algorithm as the source and set RESTORE_PASSWORD_HASH_ALGORITHM accordingly before importing. The importer refuses mixed hash algorithms.
- [ ] Confirm the restored email/password owner can sign in with the existing password. The importer deliberately rejects phone-based, MFA, SSO, anonymous and non-email identity accounts; sessions and refresh tokens must be re-established. Storage objects, project settings and Google Drive files are separate recovery concerns.
- [ ] Preserve the exact original DRIVE_TOKEN_ENCRYPTION_KEY in an approved secret manager. A newly generated key cannot decrypt existing tokens.
- [ ] Approve realistic RPO/RTO targets only after a restore drill measures backup cadence and restore time.

## 4. Academic and legal decisions

- [ ] Appoint the first platform curator and independently verify each seeded Cambridge/Edexcel syllabus heading against current official specifications and administrative-zone availability before publishing any catalogue.
- [ ] Review AI-generated answer quality and mark-scheme provenance with qualified subject reviewers; never describe unreviewed AI content as verified.
- [ ] Review the privacy notice against actual provider configuration, retention settings and applicable legal requirements.
- [ ] Add a responsible contact channel for access, correction and deletion requests before inviting additional users.

## 5. Explicitly not authorized by this checklist

- Applying migrations to the existing shared/production Supabase project.
- Merging the feature branch to main or deploying a production release.
- Enabling paid Supabase/Vercel/provider plans or incurring AI/search charges.
- Creating real student accounts/data or using personal credentials for E2E.
- Publishing seeded syllabus drafts without qualified human review.


## Worker and upload implementation audit — 2026-11-05

- Reviewed the feature-branch worker route, original-PDF route, resumable upload start/chunk routes, Drive helper, recovery tests and deployment runbook.
- Upload session tokens are encrypted, owner-bound and restricted to validated Google Drive resumable-session URLs. Chunk bodies are capped at 1 MiB, ranges are validated, and Drive's confirmed offset is returned to the client. Completed uploads are registered through a server-only RPC; uncertain registration outcomes do not delete a possibly committed Drive object.
- Original-PDF retrieval is owner-scoped and verifies Drive metadata, PDF signature, exact byte count and SHA-256 before returning private no-store bytes. Automated tests cover byte equality, mismatch rejection, owner denial and generic upstream failure handling.
- Worker code uses an atomic database claim, bounded processing, retry policy and atomic completion/failure RPCs. Existing completed jobs demonstrate prior execution, but not an independently exercised fresh interruption/resume flow.
- **Scheduler status:** `.github/workflows/document-worker.yml` contains `workflow_dispatch` only. It does not contain a recurring schedule. The worker therefore requires a manual Actions dispatch until a scheduler is intentionally added and safely integrated on the default branch.
- Current non-production database snapshot: 1 Drive connection, 3 documents (1 ready, 2 review_required), 2 completed jobs, 3 pages, 0 queued/running/failed jobs. Two documents contain Drive ID, SHA-256 and positive file-size metadata.
