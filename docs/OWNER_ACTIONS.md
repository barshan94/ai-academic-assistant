# Owner actions required before production

This document separates repository implementation from actions that require the project owner's provider accounts, credentials, policy decisions or operational responsibility. Do not paste secrets into ChatGPT, GitHub issues, source files or this document.

## 1. Environment and provider setup

### Verified preview configuration — 2026-11-03

Read-only inspection of the Vercel project `ai-academic-assistant` on the Hobby team confirmed that the latest feature-branch deployment for commit `311b3ac2e0abbd950d3c5a732f5e12d60466f4df` is **READY**. The project has no runtime error clusters in the last 24 hours. The preview build being READY does not mean the application integrations are configured or accepted.

The Vercel environment inventory contains only:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, both set for preview, production and development.
- `DRIVE_TOKEN_ENCRYPTION_KEY`, present as a sensitive variable but with an empty value.

The following are absent: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, Google OAuth client ID/secret, and AI provider credentials/model. No secret values were requested, changed or displayed. Do not add credentials until the owner approves the provider, account, budget and data-processing terms. The preview's deployment readiness and process-level health check do not prove Supabase connectivity, database schema readiness, authenticated application functionality, or live provider integrations.

### Latest implementation-branch verification — 2026-11-03

Latest verified application-code commit: `086c19c21b20187758330dbbd5053b05cf1535eb`. Current branch head is `cd25c72efde45f00984bb5e7d23ae59b8ca30086`; subsequent commits are documentation-only.

Current-head CI is green where runnable:
- Foundation workflow `41597601824`: lint, application/Playwright type-checks, production environment contract validation, production dependency audit, production build and **207 unit tests across 40 files** passed.
- Chromium browser smoke in the same run: **10 passed, 1 skipped**. The skipped test is the authenticated two-account lifecycle.
- Database authorization workflow `41597602010`: fresh isolated local Supabase migration replay and **236 pgTAP assertions across 11 files** passed.
- Secret scanning workflow `41597602016`: passed.
- Authenticated browser workflow `41597601831`: skipped because dedicated non-production credentials and enablement are not configured. This is not a pass.
- The full dev-inclusive npm audit still reports **13 moderate findings**; the production-only audit reports zero. ERR-124 remains open and is not suppressed.

Fresh read-only hosted Supabase inspection on 2026-11-03:
- Existing `academic-assistant` project remains `ACTIVE_HEALTHY`, PostgreSQL 17.11, Free plan, region `ap-south-1`.
- Hosted migration ledger remains **53 entries**; the same two version/name mismatches remain, with **44 genuinely pending migrations** after version-aware reconciliation.
- The hosted `public.documents.page_count` constraint still allows any non-negative value or NULL; it does not match the branch's intended 1–50 non-null contract.
- Security advisor returned zero findings. Performance advisor returned 60 informational unused-index notices; the project tables are empty, so no indexes were dropped.

No hosted migration or data was changed. The hosted schema remains behind the branch and must not receive this application until the approved version-aware reconciliation is executed and verified. The CI results above prove local isolated migration replay, not hosted schema parity or live integrations. PR #1 remains open and draft; no merge or production deployment occurred.

- [ ] Confirm the non-production Vercel deployment target and deploy only after the implementation branch is ready for the testing phase.
- [x] Inventory the existing Supabase organization and projects. Reuse the existing Free-plan `academic-assistant` project as the non-production candidate; do not create another account or project by default.
- [x] Owner confirmed `academic-assistant` as the dedicated non-production reconciliation/testing target; no reset is proposed. `durga-map` remains excluded because it contains existing application data.
- [x] Owner authorized the hosted migration plan on 2026-11-01, including version-aware repair of the two byte-identical renamed migration pairs and application of the 44 pending migrations. This authorization applies only to the existing non-production project; it does not authorize production changes.
- [ ] Execute the approved plan with the pinned Supabase CLI (`2.122.0`) using `scripts/reconcile-nonprod-supabase-migrations.sh`. The script exports credentials through environment variables and no longer places the database password in the CLI process argument list. The connected Supabase interface does not expose version-specific migration repair, so the hosted project remains unchanged until a CLI session is available. Do not substitute generic SQL or migration-apply calls.
  - Phone-friendly alternative after the workflow file has been reviewed and merged to the default branch: use the manual GitHub Actions workflow `.github/workflows/reconcile-nonprod-migrations.yml` (GitHub only exposes `workflow_dispatch` for workflows present on the default branch). This workflow is currently on the feature branch and is not yet dispatchable. First add repository Actions secrets `SUPABASE_ACCESS_TOKEN` (scoped to this project) and `SUPABASE_DB_PASSWORD`; never send them in chat. Open Actions → Non-production Supabase migration reconciliation → Run workflow on `feature/m3-ai-solver`. Start with `reconcile-and-dry-run`; this repairs only the two previously SQL-verified migration version entries, then prints the pending migration dry-run without applying the 44 pending DDL migrations. Review the output. Only after deciding to apply, run again with `reconcile-and-apply` and type the exact confirmation phrase requested by the workflow. This is a non-production-only operation; it does not deploy the app.
- [ ] After the migrations are reconciled, create two disposable confirmed Auth users and configure the documented authenticated E2E secrets/variable; do not use personal or production accounts.
- [ ] Configure the server-side Supabase URL, publishable key and service-role key in the hosting provider. The service-role key must remain server-only.
- [ ] Create a dedicated Google Cloud project and OAuth web client for non-production. Enable Drive API, allow only the intended test user, and register the exact HTTPS callback URL.
- [ ] Confirm Google consent-screen publishing mode and refresh-token lifetime. Store the client secret and a stable 32-byte Drive token-encryption key in the hosting provider's secret store.
- [ ] Select an AI provider/model only after reviewing its data-processing terms, retention, geographic processing, fallback behavior and price. Set an explicit spend limit. Configure both answer and chapter-note tasks only if approved.
- [ ] Keep web search disabled unless its provider, query disclosure and cost are explicitly approved.
- [ ] Run the production-environment preflight only against the isolated deployment after all required variables have been configured. It checks presence/format, not connectivity.

## 2. GitHub Actions and operations

Configure repository Actions secrets from the deployment dashboard; never commit their values.

- [ ] APP_BASE_URL: isolated deployment HTTPS origin.
- [ ] CRON_SECRET: same strong random secret used by the deployment's worker and readiness endpoints.
- [ ] E2E_SUPABASE_URL and E2E_SUPABASE_PUBLISHABLE_KEY: dedicated test project only.
- [ ] E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD: two disposable, confirmed test identities.
- [ ] E2E_QUESTION_ID and E2E_SOLUTION_ID: disposable fixture IDs created by the documented seed procedure.
- [ ] ALERT_WEBHOOK_URL: optional HTTPS webhook, only if approved.
- [ ] Enable authenticated E2E only after the isolated project, migrations and fixtures are ready.
- [ ] Merge the reviewed workflow changes to the default branch only after explicit approval; scheduled GitHub workflows do not run from this feature branch.
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
