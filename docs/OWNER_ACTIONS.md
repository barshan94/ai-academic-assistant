# Owner actions required before production

## Verified live status — 2026-11-04 (read-only)

### GitHub and Vercel

- Feature branch: `feature/m3-ai-solver`, head `4e7208902b30dd422e9fcc07a7808958e0613ce1`.
- Latest feature Preview: **READY**, [open current preview](https://ai-academic-assistant-6rr20j9vg-barshan-s-team.vercel.app). This is not Production.
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

No secret values were retrieved, copied, rotated, or changed during this inspection.

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
