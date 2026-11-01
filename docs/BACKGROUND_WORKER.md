# Background document worker setup

The feature branch includes a scheduled server-side worker at `GET /api/cron/process-documents`. It claims at most one job per invocation, uses conditional database updates to prevent duplicate claims, processes queued/failed jobs, reclaims stale running jobs after 15 minutes, and respects each job's `max_attempts` value.

## Required deployment environment

Configure these values in the dedicated non-production Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose with a `NEXT_PUBLIC_` prefix.
- `CRON_SECRET` — long random secret used by the worker route to authenticate scheduled invocations.
- `DRIVE_TOKEN_ENCRYPTION_KEY` — the same base64-encoded 32-byte key used to encrypt existing Drive refresh tokens. Rotating it without re-encrypting stored tokens will break Drive connections.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The scheduler is GitHub Actions, defined in `.github/workflows/document-worker.yml`, and requests one job every five minutes. Configure these repository Actions secrets:

- `APP_BASE_URL` — the HTTPS base URL of the deployed application, for example `https://your-app.example.com` (no path suffix).
- `CRON_SECRET` — the same random secret configured in the Vercel environment.

GitHub scheduled workflows run only from the repository's default branch. This feature-branch workflow will not run on a schedule until it is merged to the default branch; do not merge it or deploy it without authorization. Once available on the default branch, GitHub Actions can also be manually dispatched. GitHub may delay scheduled runs during periods of high load.

This uses GitHub Actions rather than a five-minute Vercel Cron expression because Vercel Hobby allows only once-daily cron execution; more frequent schedules require Pro or Enterprise. Do not configure both schedulers at once. See the [Vercel cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Operational behavior

- The worker returns HTTP 401 without the exact bearer secret.
- It returns HTTP 503 when required database credentials are missing.
- It uses the Supabase service-role key only inside the server route; every row operation is still constrained by the job's owner and document IDs.
- A conditional update on job ID, owner ID, current status, attempt count and prior start time is the atomic claim. Concurrent invocations cannot both claim the same observed job state.
- Queued and failed jobs are eligible. A running job is eligible only after the 15-minute stale threshold or when its start timestamp is missing.
- Retry attempts stop at the row's configured `max_attempts`.
- The worker refuses to replace extracted pages referenced by saved questions or chapter-note sources.
- A job failure is persisted as a bounded error message and can be retried while its retry budget remains.
- The worker processes one job per invocation; backlog throughput therefore depends on the scheduler frequency.

## Before production use

1. Configure the values above in a dedicated non-production deployment.
2. Verify that the Drive encryption key matches the key used for the test project's encrypted tokens.
3. Upload a small test PDF using a test Google account.
4. Invoke the route with a deliberately wrong secret and confirm HTTP 401.
5. Invoke the route with the correct secret and confirm exactly one job completes.
6. Trigger two concurrent invocations and verify the same job is processed only once.
7. Force a transient failure and confirm retries stop at `max_attempts`.
8. Simulate a stale running job and confirm the worker reclaims it.
9. Verify GitHub Actions execution history and alerting before using it for real academic documents.

The worker code and workflow do not mean the deployment is operational until the Vercel environment variables, GitHub Actions secrets, default-branch workflow activation, Google Drive credentials and real integration tests are configured.
