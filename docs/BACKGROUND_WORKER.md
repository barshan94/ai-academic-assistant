# Background document worker setup

The feature branch includes a server-side worker endpoint at `POST /api/cron/process-documents`. It claims at most one job per invocation, uses conditional database updates to prevent duplicate claims, processes queued/failed jobs, reclaims stale running jobs after 15 minutes, and respects each job's `max_attempts` value.

## Current activation state

The checked-in `.github/workflows/document-worker.yml` is present only on `feature/m3-ai-solver`; it is not integrated into the repository's default branch. GitHub requires a `workflow_dispatch` workflow file to exist on the default branch before it can be manually dispatched from Actions. Therefore, **the worker workflow is not currently dispatchable through the repository Actions UI**.

Do not copy or merge this workflow alone to make it dispatchable. The worker route, its supporting application code, compatible database schema/RPCs, authentication, idempotency, Preview target and repository secrets must be reviewed as one integration. Do not add a recurring schedule. Scheduled GitHub Actions workflows run from the default branch, and this project has not passed live concurrency/recovery acceptance.

When a separately reviewed integration makes the workflow available, it remains manual-only and requires the boolean `confirm_nonprod_worker_run` input to be explicitly set to `true`. The job is restricted to `feature/m3-ai-solver`, serializes invocations, checks out the selected revision without persisting checkout credentials, and invokes exactly one POST request. It does not loop or schedule follow-up requests.

## Required non-production deployment environment

Configure these values only in the dedicated non-production Preview environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose with a `NEXT_PUBLIC_` prefix.
- `CRON_SECRET` — long random secret of at least 32 characters used by the worker route to authenticate operator-triggered invocations.
- `DRIVE_TOKEN_ENCRYPTION_KEY` — the same base64-encoded 32-byte key used to encrypt existing Drive refresh tokens. Rotating it without re-encrypting stored tokens will break Drive connections.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The GitHub Actions workflow accepts only this exact stable feature-branch Preview origin for `APP_BASE_URL`:

`https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`

Do not substitute a generic hostname, deployment-specific URL, Production URL, URL path, credentials or trailing slash. Configure these repository Actions secrets only after the target and the matching Preview-side secret have been independently checked:

- `APP_BASE_URL` — the exact stable Preview origin above.
- `CRON_SECRET` — the same value configured in the feature-branch Preview environment; never print it or put it in source control.

The invocation script independently enforces the exact Preview origin and a minimum 32-character secret. It rejects redirects, uses a bounded timeout and accepts only a bounded JSON response matching the documented worker response contract. A successful completion must contain a UUID `job_id` and a page count from 1 through 100. Non-success response bodies and upstream exception text are not logged.

## Operational behavior

- The worker accepts POST only and returns HTTP 401 without the exact bearer secret.
- It returns HTTP 503 when required database credentials are missing.
- It uses the Supabase service-role key only inside the server route; row operations are constrained by the job's owner and document IDs.
- A conditional update on job ID, owner ID, current status, attempt count and prior start time is the atomic claim. Concurrent invocations cannot both claim the same observed job state.
- Queued and failed jobs are eligible. A running job is eligible only after the 15-minute stale threshold or when its start timestamp is missing.
- Retry attempts stop at the row's configured `max_attempts`.
- The worker refuses to replace extracted pages referenced by saved questions or chapter-note sources.
- A job failure is persisted as a bounded error message and can be retried while its retry budget remains.
- The worker processes one job per invocation. Because the workflow is not currently dispatchable and has no schedule, queued work remains pending. GitHub Actions does not automatically retry this POST request; after a persisted failure, a later, separately authorized invocation is required to use the remaining retry budget.
- The route has a 60-second platform duration limit. The invocation script allows 65 seconds for the HTTP request, while the Actions job has a 3-minute overall timeout. These are bounds, not proof that a live Drive operation completes within them.

## Before any non-production live acceptance

1. Confirm that the selected Preview is the approved non-production environment and that the worker route and compatible database RPCs are deployed together.
2. Confirm the Drive encryption key matches the key used for the test project's encrypted tokens; do not rotate it.
3. Confirm the repository Actions `APP_BASE_URL` and Preview `CRON_SECRET` match without revealing either value.
4. Use a dedicated test Google account and a small synthetic PDF, never real student material.
5. Invoke the route with a deliberately wrong secret and confirm HTTP 401.
6. With explicit owner authorization, invoke the workflow once and confirm exactly one job completes.
7. Run a separately approved concurrent-claim test and verify that the same job is processed only once.
8. Force a controlled transient failure and confirm retries stop at `max_attempts`.
9. Simulate a stale running job and verify safe recovery and terminalization.
10. Verify original-PDF retrieval, byte length and SHA-256 against the uploaded source; separately check the OCR text against the original PDF.

Automated tests and a READY Preview do not prove live Drive upload/recovery, OCR accuracy, concurrency behavior, or operational alerting. Do not mark those acceptance gates complete without the actual non-production test evidence and human review.
