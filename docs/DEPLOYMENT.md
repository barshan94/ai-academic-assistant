# Deployment runbook

## Scope and deployment policy

This guide describes a controlled deployment of the Next.js application. It does not authorize a production release, production database migration, paid infrastructure, or a merge to `main`.

Use a dedicated non-production Supabase project and Google OAuth client for the first deployment and acceptance. Never point a preview deployment at production credentials. The application is a private, single-owner workspace with optional question-scoped teacher access; public sign-up is intentionally disabled.

## Runtime requirements

- Node.js 22.
- A hosting platform that supports the Next.js 15 App Router, Node.js route handlers, server-side environment variables and streaming request bodies.
- HTTPS on every non-local deployment.
- Supabase PostgreSQL/Auth project in the selected region.
- Google Drive API OAuth web client with the exact callback URI.
- GitHub Actions access for the scheduled document worker and readiness monitor.
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
| `AI_API_KEY`, `AI_MODEL` | Yes for solver readiness | Single OpenAI-compatible provider configuration. |
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

The preflight script reads the current process environment; it does not parse `.env.local`. It checks required variable presence, HTTPS callback/project/provider URLs, canonical Drive-key encoding, cron-secret length and AI task coverage. It prints variable names and validation failures only, never secret values. A passing preflight is not a connectivity test.

## Supabase preparation

1. Create a separate non-production project. Keep the configured Mumbai region (`ap-south-1`) unless the owner explicitly changes the architecture decision.
2. Confirm the target is disposable and no real student or owner data is present.
3. Inspect the migration history and reconcile the known remote migration-history drift (ERR-007) using `docs/MIGRATION_RECONCILIATION.md`. The latest read-only comparison found 94 repository migrations versus 53 remote ledger entries, only 51 exact matches, two timestamp/name mismatches and 41 repository versions absent from the remote ledger. Do not run `supabase db push` or migration repair blindly.
4. Review every pending migration, especially grants, RLS, SECURITY DEFINER/INVOKER functions, trigger order and the server-only document registration RPC.
5. Apply migrations only to the isolated target using the current pinned Supabase CLI procedure. Review the CLI `--help` output and current Supabase docs before selecting commands.
6. Inspect the resulting schema, effective grants, policies and function execute privileges. The source migration files are not evidence that the hosted target has been updated.
7. Provision the initial owner identity privately in Supabase Auth. Keep public sign-ups disabled.
8. Provision any platform curator membership out of band; users must never be able to self-promote.

There are 50+ forward-only migrations. Do not manually cherry-pick only the latest migration. Resolve migration-history drift first and apply the complete intended chain to a clean isolated project.

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

The document worker runs every five minutes and handles at most one job per invocation. The readiness monitor runs every fifteen minutes. GitHub scheduled workflows run from the repository's default branch; a workflow committed only to a feature branch is not an active schedule. The workflows also support manual dispatch, but must first be reviewed to ensure they target the intended non-production host.

## Build and release sequence

The owner's workflow requires implementation completion before the separate testing and fixing phases. Do not use this runbook as permission to skip that order.

When the owner authorizes testing:

1. Run lint, typecheck, unit tests and production build.
2. Run local Supabase migrations and all pgTAP authorization tests from a clean state.
3. Run authenticated two-account browser acceptance against the isolated project.
4. Complete Google OAuth, Drive upload/resume/OCR, worker, AI provider and readiness acceptance.
5. Review CI results, dependency audit, secret scan and Supabase advisors.
6. Create and verify an encrypted backup of the isolated project; rehearse the documented restore limitations.
7. Review `docs/PRODUCTION_READINESS.md` and close every release-blocking item.
8. Obtain explicit approval before any production merge, migration or deployment.

## Rollback and forward-fix policy

- Application rollback: use the hosting provider's documented previous-deployment promotion/rollback feature. Confirm compatibility with the current database schema before reverting application code.
- Database rollback: migrations are forward-only. Do not assume a previous application deployment is compatible with a newer schema. Prefer a reviewed forward corrective migration.
- Data restore: never restore into the source project as an experiment. Use the isolated recovery procedure in `docs/BACKUP_RESTORE.md`.
- Secret compromise: rotate the affected provider secret, invalidate/revoke the external credential where supported, update the hosting and GitHub secret stores, then redeploy. If `DRIVE_TOKEN_ENCRYPTION_KEY` is lost, existing encrypted refresh tokens cannot be recovered by rotating to a new key; restore the original key or reconnect Drive.
- Worker incident: disable the GitHub scheduled workflow to stop new claims, preserve database rows, inspect redacted logs and job state, then resume only after the root cause is addressed.

## Explicit non-goals

This repository does not currently provide automatic Supabase Free backups, point-in-time recovery, complete Auth identity backup/restore, Google Drive file backup, guaranteed external paging, or proof of end-to-end provider availability. Do not advertise these capabilities.
