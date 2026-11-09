# Operational monitoring setup

## What the readiness monitor checks

The feature branch contains `.github/workflows/health-monitor.yml` with a 15-minute schedule and a manual trigger. GitHub executes scheduled workflows only from the repository's default branch; this file is not on `main`, so **the schedule is currently inactive**. Do not treat it as an active monitor or merge it solely to activate monitoring. If separately approved and integrated later, it will call the protected `/api/health/ready` route. Its bearer credential is sent only after an exact-match check against the stable feature-branch Preview origin (`https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`); it must fail closed for Production, arbitrary HTTPS hosts, deployment-specific aliases, paths or credentials. The document worker is a separate authenticated `POST` endpoint because processing a job mutates queue and academic records. It remains manual-dispatch only; this readiness monitor does not invoke or schedule document processing.

The route checks required application configuration and performs bounded, parallel, zero-row Supabase Data API probes against the centralized required-table inventory for document intake, Drive connections, questions/solutions/teacher review, mark schemes, classification history, private and shared syllabus catalogues and evidence, chapter notes, revision, practice, the weekly study calendar, platform-curator membership, and AI/upload/web-research quota and provenance records. A reachable database with only a partial migration chain therefore reports not ready. The probes return no academic rows and run in batches of five to avoid creating a burst of 30 simultaneous requests against a small database instance; a failed batch stops later probes. Each request has a five-second timeout and all batches share an eight-second overall database-probe deadline, keeping the endpoint within the monitor's ten-second latency threshold. They do not prove every migration, every constraint/policy/function, or external Google Drive and AI provider connectivity. The workflow uses Node fetch with redirects disabled, a 20-second hard timeout and a streamed 4 KiB response cap. It fails if the endpoint is unreachable, returns a non-200 status, does not return the generic `ready` status, or takes more than the configured 10-second response threshold. The threshold is currently set in the workflow and can be adjusted after a real deployment baseline is measured.

An optional Slack-compatible incoming webhook can receive a generic failure notification. If it is not configured, the workflow relies on GitHub Actions failure notifications. This monitor does **not** prove Google Drive OAuth, file upload/OCR, AI inference, background-job completion, or end-user authentication. It does not aggregate application logs, retain latency trends, or provide guaranteed on-call paging.

## Required GitHub Actions repository secrets

Configure these secrets under **Repository → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `APP_BASE_URL` | Exact value `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app` (stable feature-branch Preview alias only). Do not use a Production URL, deployment-specific hostname, path, query or trailing slash. |
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
- AI provider credentials and a provider/pool covering `answer` and `chapter-note` only when `AI_ENABLED=true`; for strict zero-cost mode keep AI disabled and leave provider credentials unset

The readiness monitor uses `CRON_SECRET` only for its protected readiness request. The feature-branch manual worker currently uses the same secret for its separate POST invocation. Do not enable a recurring worker schedule. Secret values are not displayed or changed by this run; any future rotation must be an owner-managed, coordinated operation.

## Activation sequence

1. Deploy a revision containing the protected readiness route.
2. Configure all required application environment variables in the deployment.
3. Configure repository secrets `APP_BASE_URL` and `CRON_SECRET`.
4. Treat this as future activation guidance only. The workflow is currently feature-branch-only and its schedule is inactive. Do not merge PR #1, deploy Production, or dispatch the monitor as part of the current release-readiness work.
5. If the owner separately approves future activation, first review the exact default-branch route and Preview target, then integrate the monitor through a separately reviewed change.
6. Only after that approval, run the monitor manually against the approved non-production target and confirm its result before relying on a schedule.
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
