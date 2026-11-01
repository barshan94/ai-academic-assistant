# Operational monitoring setup

## What the readiness monitor checks

The scheduled GitHub Actions workflow at `.github/workflows/health-monitor.yml` runs every 15 minutes and can also be started manually. It calls the protected `/api/health/ready` route.

The route checks required application configuration and performs bounded, parallel, zero-row Supabase Data API probes against the centralized required-table inventory for document intake, Drive connections, questions/solutions/teacher review, mark schemes, classification history, private and shared syllabus catalogues and evidence, chapter notes, revision, practice, the weekly study calendar, platform-curator membership, and AI/upload/web-research quota and provenance records. A reachable database with only a partial migration chain therefore reports not ready. The probes return no academic rows. They do not prove every migration, every constraint/policy/function, or external Google Drive and AI provider connectivity. The workflow uses Node fetch with redirects disabled, a 20-second hard timeout and a streamed 4 KiB response cap. It fails if the endpoint is unreachable, returns a non-200 status, does not return the generic `ready` status, or takes more than the configured 10-second response threshold. The threshold is currently set in the workflow and can be adjusted after a real deployment baseline is measured.

An optional Slack-compatible incoming webhook can receive a generic failure notification. If it is not configured, the workflow relies on GitHub Actions failure notifications. This monitor does **not** prove Google Drive OAuth, file upload/OCR, AI inference, background-job completion, or end-user authentication. It does not aggregate application logs, retain latency trends, or provide guaranteed on-call paging.

## Required GitHub Actions repository secrets

Configure these secrets under **Repository → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `APP_BASE_URL` | The deployed application HTTPS origin only, e.g. `https://your-domain.example`. Do not include a path, query or trailing slash. |
| `CRON_SECRET` | The same random secret configured as the deployed application's `CRON_SECRET`; use at least 32 characters. |
| `ALERT_WEBHOOK_URL` (optional) | HTTPS Slack-compatible incoming webhook. The workflow sends only a generic failure message and a link to the GitHub Actions run. |

Do not put secret values in workflow YAML, commit them to the repository, or paste them into issue comments.

The deployed application must also have the required readiness configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `DRIVE_TOKEN_ENCRYPTION_KEY`
- `AI_API_KEY` and `AI_MODEL`, or a valid `AI_PROVIDER_POOL` supporting both `answer` and `chapter-note`

Use the exact same `CRON_SECRET` for the protected readiness endpoint and scheduled document worker. Rotate it in the deployment and GitHub repository together.

## Activation sequence

1. Deploy a revision containing the protected readiness route.
2. Configure all required application environment variables in the deployment.
3. Configure repository secrets `APP_BASE_URL` and `CRON_SECRET`.
4. Merge the workflow to the repository's default branch. GitHub scheduled workflows run from the default branch; a workflow present only on a feature branch is not an active scheduled monitor.
5. Open **Actions → Production readiness monitor** and run it manually.
6. Confirm a successful run before relying on the 15-minute schedule.
7. Review GitHub Actions failure notifications and configure repository/user notification preferences. GitHub notification delivery is not a guaranteed paging service.

## Failure interpretation

- **HTTP 401:** secret mismatch, missing secret, or deployment has not received the updated secret.
- **HTTP 503:** required configuration is missing/invalid, or Supabase Data API connectivity failed.
- **Connection/timeout failure:** deployment is unreachable or the readiness route did not respond within the configured timeout.
- **Unexpected response:** the deployed route may be stale or incompatible with this monitor.

The workflow intentionally does not print the response body or bearer token. Inspect deployment logs through the provider's authenticated dashboard; never add secrets or student data to workflow output.

## Still outside this monitor

- Google OAuth token exchange and refresh.
- Google Drive resumable upload, OCR and background worker success rate.
- AI provider availability, quality, latency and cost.
- Dedicated dashboards, alert thresholds, external paging and incident escalation.
- Backup archive creation, off-site retention and restore drills.
- Authenticated two-account and browser acceptance.

These remain separate implementation, configuration or acceptance tasks. A green monitor run is not a production release approval.

## Incident response

Use `docs/INCIDENT_RESPONSE.md` for worker backlog, Supabase/quota outage, Google OAuth compromise, AI-provider outage, suspected data exposure and Drive encryption-key loss. Do not manually rewrite job states or bypass quota/security RPCs during an incident.

Use `docs/PRODUCTION_READINESS.md` as the release gate. A successful readiness-monitor run is not a release approval and does not establish full restore capability.
