# Deployment runbook

## Scope and deployment policy

This guide describes a controlled deployment of the Next.js application. It does not authorize a production release, production database migration, paid infrastructure, or a merge to `main`.

Use only the already approved existing `academic-assistant` Supabase project and existing Google Drive account. Do not create another database/project. Keep Preview and Production credentials separate; never point Preview at Production credentials. The application is a private, single-owner workspace with optional question-scoped teacher access; public sign-up is intentionally disabled. The current owner scope prohibits hosted migration-ledger changes, hosted DDL, Production deployment/configuration changes, worker dispatch and PR merge.

## Runtime requirements

- Node.js 22.
- A hosting platform that supports the Next.js 15 App Router, Node.js route handlers, server-side environment variables and streaming request bodies.
- HTTPS on every non-local deployment.
- Supabase PostgreSQL/Auth project in the selected region.
- Google Drive API OAuth web client with the exact callback URI.
- GitHub Actions access for manually dispatched, owner-approved non-production worker/monitor checks only. The checked-in worker and health-monitor workflows are not active schedules.
- AI provider credentials only after provider terms, data handling and expected charges have been explicitly approved.

Do not assume that a static export or edge-only runtime is supported. PDF processing, cryptography and bounded streaming routes use the Node.js runtime.

## Environment configuration

Set these values in the hosting provider's server-side environment settings. Never add service-role keys, Google client secrets, AI keys, Drive encryption keys or cron secrets to public build arguments or `NEXT_PUBLIC_*` variables.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | HTTPS Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/legacy anon key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Bypasses RLS; keep out of client bundles. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | Server-only OAuth secret. |
| `GOOGLE_DRIVE_REDIRECT_URI` | Yes | Exact HTTPS URL ending `/api/drive/callback`. |
| `DRIVE_TOKEN_ENCRYPTION_KEY` | Yes | Canonical Base64 encoding of exactly 32 random bytes. Keep stable and back it up separately. |
| `CRON_SECRET` | Yes | Random secret of at least 32 characters, shared with GitHub worker and readiness monitor secrets. |
| `AI_ENABLED` | No | Defaults to the disabled/zero-provider profile when unset or not `true`. Keep `false` for strict zero-cost operation; readiness does not require AI provider credentials in this mode. |
| `AI_API_KEY`, `AI_MODEL` | Required only when `AI_ENABLED=true` and no valid provider pool is configured | Single OpenAI-compatible provider configuration. Provider calls may incur charges. |
| `AI_API_BASE_URL`, `AI_PROVIDER_NAME` | Optional | Defaults to OpenAI-compatible base URL and provider label. |
| `AI_PROVIDER_POOL` | Alternative | JSON array of up to eight providers. At least one enabled provider must support both `answer` and `chapter-note`. |
| `AI_ALLOW_PROVIDER_FALLBACKS` | Optional | Defaults off; enabling may incur additional charges. |
| `WEB_SEARCH_PROVIDER`, `BRAVE_SEARCH_API_KEY` | Optional | Only configure after explicit cost and data-sharing approval. |

Start from `.env.example`. The example file contains blank placeholders only.

Before deployment, inject the values into the environment and run:

```bash
npm ci
npm run check:production-env
```

The preflight script reads the current process environment; it does not parse `.env.local`. It checks required variable presence, HTTPS callback/project URLs, canonical Drive-key encoding and cron-secret length. AI provider configuration is required only when `AI_ENABLED=true`; leave it disabled for strict zero-cost mode. It prints variable names and validation failures only, never secret values. A passing preflight is not a connectivity test.

## Supabase preparation — current owner scope

The existing `academic-assistant` project is the only approved project for this work. Do not create a second project/database, reset data, repair the hosted migration ledger, dispatch migration reconciliation, or apply hosted migrations. These actions are not authorized by this runbook.

The repository's migration chain must be reviewed against the actual hosted schema before any future authorized change. Existing migration-history snapshots in `docs/MIGRATION_RECONCILIATION.md` are historical evidence and contain superseded counts; do not execute their preserved procedures. The current release gate is schema/function/privilege parity review without mutation. Local isolated migration replay and pgTAP CI are not proof that the hosted project has the same schema.

Do not use Production as a test environment. Any future non-production schema mutation requires a separate explicit owner decision, a reviewed forward-only migration, a verified target and a recorded post-change schema/privilege check.

## Google OAuth and Drive

1. Enable Google Drive API in a dedicated Google Cloud project.
2. Configure an OAuth web client and exact redirect URI:
   `https://YOUR_NON_PRODUCTION_HOST/api/drive/callback`.
3. Add only the intended owner account as an OAuth test user until consent-screen verification is complete.
4. Configure the exact same redirect URI in `GOOGLE_DRIVE_REDIRECT_URI`.
5. Use the `drive.file` scope only. Do not broaden Drive permissions.
6. Generate a unique 32-byte encryption key for the non-production environment. Never reuse a production encryption key in preview/test environments.
7. Confirm OAuth refresh-token retention constraints for the current Google consent-screen publishing mode. Testing-mode refresh tokens may expire.
8. Verify disconnect/reconnect and token revocation only against the non-production account.

## GitHub Actions configuration

Set repository Actions secrets only after the non-production app is deployed:

| Secret | Purpose |
|---|---|
| `APP_BASE_URL` | HTTPS origin of the non-production app, without a path or trailing slash. |
| `CRON_SECRET` | Exact same value as the deployed application's `CRON_SECRET`. |
| `ALERT_WEBHOOK_URL` | Optional HTTPS Slack-compatible incoming webhook. |
| `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` | Dedicated test project only. |
| `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD` | Dedicated test owner account. |
| `E2E_TEACHER_EMAIL`, `E2E_TEACHER_PASSWORD` | Separate dedicated test teacher account. |
| `E2E_QUESTION_ID`, `E2E_SOLUTION_ID` | Disposable test fixture identifiers. |

Enable the authenticated E2E workflow only after the test project and fixtures exist. Do not reuse production accounts or credentials.

The document-worker and health-monitor workflows are manual-dispatch only in the current operating scope. Do not add a schedule or dispatch either workflow until the branch/route integration, exact Preview target, credentials, authentication, migration compatibility and idempotency are independently verified and the owner explicitly approves the invocation. GitHub scheduled workflows run from the repository's default branch; feature-branch workflow files do not create an active schedule. The authenticated two-account E2E workflow uses the six configured non-production secrets and does not require `ENABLE_AUTHENTICATED_E2E`, `E2E_QUESTION_ID` or `E2E_SOLUTION_ID`.

## Build and release sequence

The owner's workflow requires implementation completion before the separate testing and fixing phases. Do not use this runbook as permission to skip that order.

When the owner authorizes testing:

1. Run lint, typecheck, unit tests and production build.
2. Run local Supabase migrations and all pgTAP authorization tests from a clean state.
3. Run authenticated two-account browser acceptance against the isolated project.
4. Complete Google OAuth, Drive upload/resume/OCR, worker, AI provider and readiness acceptance.
5. Review CI results, dependency audit, secret scan and Supabase advisors.
6. Create and verify an encrypted backup of the isolated project; rehearse Auth Admin API recreation of supported email/password accounts before restoring application data, then verify original-password sign-in and document unsupported account types.
7. Review `docs/PRODUCTION_READINESS.md` and close every release-blocking item.
8. Obtain explicit approval before any production merge, migration or deployment.

## Rollback and forward-fix policy

- Application rollback: use the hosting provider's documented previous-deployment promotion/rollback feature. Confirm compatibility with the current database schema before reverting application code.
- Database rollback: migrations are forward-only. Do not assume a previous application deployment is compatible with a newer schema. Prefer a reviewed forward corrective migration.
- Data restore: never restore into the source project as an experiment. Use the isolated recovery procedure in `docs/BACKUP_RESTORE.md`.
- Secret compromise: rotate the affected provider secret, invalidate/revoke the external credential where supported, update the hosting and GitHub secret stores, then redeploy. If `DRIVE_TOKEN_ENCRYPTION_KEY` is lost, existing encrypted refresh tokens cannot be recovered by rotating to a new key; restore the original key or reconnect Drive.
- Worker incident: disable the GitHub scheduled workflow to stop new claims, preserve database rows, inspect redacted logs and job state, then resume only after the root cause is addressed.

## Explicit non-goals

This repository does not currently provide automatic Supabase Free backups, point-in-time recovery, complete Auth identity backup/restore (only a limited email/password account export/import path is implemented and unverified), Google Drive file backup, guaranteed external paging, or proof of end-to-end provider availability. Do not advertise these capabilities.
