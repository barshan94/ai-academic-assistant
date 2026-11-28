# Background document worker setup

The feature branch includes a server-side worker endpoint at `POST /api/cron/process-documents`. It claims at most one job per invocation, uses conditional database updates to prevent duplicate claims, processes queued/failed jobs, reclaims stale running jobs after 15 minutes, and respects each job's `max_attempts` value.

## Current activation state and default-branch risk

The default branch already contains `.github/workflows/document-worker.yml`, so GitHub exposes the manual **Run workflow** action. However, the `main` version is a legacy implementation: it has no explicit confirmation input, no branch restriction, no exact Preview-origin allowlist, and sends `CRON_SECRET` to whatever HTTPS `APP_BASE_URL` is configured. **Do not dispatch this workflow with the `main` ref.** If that secret is wrong or points to an unintended HTTPS origin, the legacy workflow can disclose the bearer credential to that origin.

The `feature/m3-ai-solver` version is more restrictive. When manually dispatched with that ref, its own workflow definition requires `confirm_nonprod_worker_run=true`, checks the exact feature branch, validates the exact stable non-production Preview origin, requires a 32-character minimum secret, checks out the selected revision without persisting checkout credentials, and sends one bounded POST request. The selected ref matters: do not select `main` and assume the feature-branch safeguards will apply.

The owner has not authorized worker dispatch. Do not run either workflow until the route/branch integration, target environment, GitHub Actions secrets, authentication, idempotency, live concurrency and recovery behavior are verified and a separate owner authorization is given. Do not add a recurring schedule. Scheduled GitHub Actions workflows run from the default branch, and this project has not passed live concurrency/recovery acceptance.

## Required non-production deployment environment

Configure these values only in the dedicated non-production Preview environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose with a `NEXT_PUBLIC_` prefix.
- `CRON_SECRET` — long random secret of at least 32 characters used by the worker route to authenticate operator-triggered invocations.
- `DRIVE_TOKEN_ENCRYPTION_KEY` — the same base64-encoded 32-byte key used to encrypt existing Drive refresh tokens. Rotating it without re-encrypting stored tokens will break Drive connections.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The feature-branch workflow accepts only this exact stable Preview origin for `APP_BASE_URL`:

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
- A confirmed job failure is persisted with a bounded error code and can be retried while its retry budget remains.
- If the failure transition is not confirmed (a rejected request, returned database error, or unexpected result), the route returns HTTP 503, records only safe metadata, and leaves reconciliation to the next queue read or stale-lease recovery. It never issues a second state transition in the same invocation.
- The worker processes at most one document per invocation. Within the bounded candidate batch it prioritizes queued/failed jobs with retry budget remaining over exhausted stale leases. If no retryable job is available, it terminalizes at most one exhausted stale job and returns `stale_job_terminalized`; if the observed lease changed before the atomic update, it returns `stale_job_rechecked`. This keeps stale cleanup to one bounded database mutation per invocation instead of allowing a backlog of exhausted leases to consume the processing deadline. There is no recurring schedule. If it is not manually invoked, queued work remains pending. GitHub Actions does not automatically retry this POST request; a later, separately authorized invocation is required to use the remaining retry budget.
- The route has a 60-second platform duration limit. After authentication it starts one 48-second wall-clock deadline shared by queue/claim/preflight time and every Google OAuth, Drive download, OCR conversion, export, and temporary-file cleanup request. Each outbound Google request is capped by both its normal per-request timeout and the remaining shared budget. This leaves up to 12 seconds for the final completion/failure transaction and response when earlier database operations finish within budget. Once the deadline expires, no later Google request is started; temporary OCR cleanup may be skipped and is recorded as a safe operational event. The invocation script allows 65 seconds for the HTTP request, while the Actions job has a 3-minute overall timeout. These are bounds, not proof that a live Drive operation completes within them.

## Before any non-production live acceptance

1. Confirm that the selected Preview is the approved non-production environment and that the worker route and compatible database RPCs are deployed together.
2. Confirm the Drive encryption key matches the key used for the test project's encrypted tokens; do not rotate it.
3. Confirm the repository Actions `APP_BASE_URL` and Preview `CRON_SECRET` match without revealing either value.
4. Select only the `feature/m3-ai-solver` ref; never dispatch the legacy `main` workflow.
5. Use a dedicated test Google account and a small synthetic PDF, never real student material.
6. Invoke the route with a deliberately wrong secret and confirm HTTP 401.
7. Only after separate owner authorization, invoke the hardened workflow once and confirm exactly one job completes.
8. Run a separately approved concurrent-claim test and verify that the same job is processed only once.
9. Force a controlled transient failure and confirm retries stop at `max_attempts`.
10. Simulate a stale running job and verify safe recovery and terminalization.
11. Verify original-PDF retrieval, byte length and SHA-256 against the uploaded source; separately check the OCR text against the original PDF.

Automated tests and a READY Preview do not prove live Drive upload/recovery, OCR accuracy, concurrency behavior, or operational alerting. Do not mark those acceptance gates complete without the actual non-production test evidence and human review.
