# Owner actions required before production

This document separates repository implementation from actions that require the project owner's provider accounts, credentials, policy decisions or operational responsibility. Do not paste secrets into ChatGPT, GitHub issues, source files or this document.

## 1. Environment and provider setup

- [ ] Confirm the non-production Vercel deployment target and deploy only after the implementation branch is ready for the testing phase.
- [x] Inventory the existing Supabase organization and projects. Reuse the existing Free-plan `academic-assistant` project as the non-production candidate; do not create another account or project by default.
- [x] Owner confirmed `academic-assistant` as the dedicated non-production reconciliation/testing target. Do not reset it or apply hosted migrations until the full migration plan is reviewed and separately approved. `durga-map` remains excluded because it contains existing application data.
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
- [ ] Confirm the target Auth project uses the same password-hashing algorithm as the source and set `RESTORE_PASSWORD_HASH_ALGORITHM` accordingly before importing. The importer refuses mixed hash algorithms.
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
