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

Latest verified branch commit: `294491308b897f2b635b188c0646b0cb010f9072`.

- Foundation workflow `41591075388`: lint, application and Playwright type-checks, unit tests, production build and production-dependency audit passed; Chromium browser smoke passed 10 credential-free tests.
- Database authorization workflow `41591075210`: isolated local Supabase migration replay and pgTAP authorization tests passed.
- Secret scanning workflow `41591075272`: passed.
- Authenticated two-account workflow `41591075349`: skipped because dedicated non-production credentials/enablement are not configured. This is not a pass.
- Pull request #1 remains open and draft. No merge or production deployment occurred.

These results validate source checks and an isolated local database only. They do not establish hosted Supabase migration completion, real Google Drive OAuth/upload/OCR, live AI-provider quality, authenticated two-account isolation, or backup/restore recovery.

- [ ] Confirm the non-production Vercel deployment target and deploy only after the implementation branch is ready for the testing phase.
- [x] Inventory the existing Supabase organization and projects. Reuse the existing Free-plan `academic-assistant` project as the non-production candidate; do not create another account or project by default.
- [x] Owner confirmed `academic-assistant` as the dedicated non-production reconciliation/testing target; no reset is proposed. `durga-map` remains excluded because it contains existing application data.
- [x] Owner authorized the hosted migration plan on 2026-11-01, including version-aware repair of the two byte-identical renamed migration pairs and application of the 44 pending migrations. This authorization applies only to the existing non-production project; it does not authorize production changes.
- [ ] Execute the approved plan with the pinned Supabase CLI (`2.122.0`) using `scripts/reconcile-nonprod-supabase-migrations.sh`. The connected Supabase interface does not expose version-specific migration repair, so the hosted project remains unchanged until a CLI session is available. Do not substitute generic SQL or migration-apply calls.
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
