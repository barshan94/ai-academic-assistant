# Document worker deployment setup

The application includes a server-side worker at `POST /api/cron/process-documents`. It claims and processes at most one eligible job per invocation. The worker route accepts POST only, is protected by a bearer secret, and uses the Supabase service-role key only on the server.

## GitHub Actions invocation and default-branch risk

The default branch already contains `.github/workflows/document-worker.yml`, so the GitHub Actions **Run workflow** button is available. The default-branch copy is legacy: it has no explicit confirmation input, no branch restriction, and accepts any HTTPS `APP_BASE_URL` before sending `CRON_SECRET`. **Do not dispatch with the `main` ref.** The legacy workflow can send the bearer credential to any HTTPS origin configured in that repository secret.

The feature-branch copy is hardened. If an owner separately authorizes a test, select the exact ref `feature/m3-ai-solver`; that branch's workflow definition requires `confirm_nonprod_worker_run=true`, checks the exact ref, restricts `APP_BASE_URL` to the stable non-production Preview origin below, requires a secret of at least 32 characters, and invokes one bounded POST. Selecting `main` does not inherit those feature-branch safeguards.

The worker remains manual-only and has no `schedule` trigger. The owner has not authorized dispatch. Do not run either version until route/branch integration, target environment, GitHub Actions secret scope and equality, authentication, idempotency, concurrency and recovery are verified and a separate owner authorization is given. Do not merge or copy the workflow alone to activate it. A future scheduler must not be enabled until the worker route, application code, database schema/RPCs, authentication, idempotency, target environment, and secrets have all been reviewed together. Scheduled GitHub workflows run from the default branch. No Vercel Cron Job is configured. The current deployment uses Vercel Hobby; do not assume Vercel provides a five-minute scheduler.

## Required non-production configuration

Configure these repository Actions secrets only after the non-production target and matching Preview secret have been independently checked:

| Secret | Value |
| --- | --- |
| `APP_BASE_URL` | Exact value `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app` (stable feature-branch Preview origin only) |
| `CRON_SECRET` | A long random secret of at least 32 characters, matching the feature-branch Preview application's `CRON_SECRET` |

The feature-branch workflow rejects any other `APP_BASE_URL`, including deployment-specific hostnames, Production URLs, unrelated HTTPS origins, credentials, paths and trailing slashes. This allowlist does not prove the GitHub secret matches the Preview. Never print either secret or put it in source files, workflow YAML, issue comments or logs.

The deployed non-production application also requires these existing server-side environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DRIVE_TOKEN_ENCRYPTION_KEY` (must match the key used to encrypt saved Drive refresh tokens; do not rotate it without a separately reviewed token re-encryption plan)

Do not use Production credentials for test workflows.

## Operational behavior

- The worker accepts POST only and returns HTTP 401 without the exact bearer secret.
- It returns HTTP 503 when required database credentials are missing.
- It uses the Supabase service-role key only inside the server route; every row operation is constrained by the job's owner and document IDs.
- A conditional update on job ID, owner ID, current status, attempt count and prior start time is the atomic claim. Concurrent invocations cannot both claim the same observed job state.
- Queued and failed jobs are eligible. A running job is eligible only after the 15-minute stale threshold or when its start timestamp is missing.
- Retry attempts stop at the row's configured `max_attempts`.
- The worker refuses to replace extracted pages referenced by saved questions or chapter-note sources.
- A job failure is persisted as a bounded error message and can be retried while its retry budget remains.
- The worker processes one job per invocation. Queue reads, claims, owner-scoped reads, exhausted-stale-job terminalization and Google requests share a 48-second processing deadline; each Supabase HTTP request is capped at 10 seconds and also respects the remaining shared deadline. Only completion/failure transitions after a job claim use a separate service-role client with a 12-second finalization window (maximum 10 seconds per HTTP request).
- Caller cancellation is preserved when a deadline signal is added. If a claim or completion response is uncertain, the worker does not issue a compensating transition; it leaves the lease for later reconciliation.
- Supabase Free projects can sleep and take time to wake. A bounded request may therefore return a retryable failure; check the document/job state before another attempt and allow the existing stale-lease recovery path to reconcile uncertain claims. This mitigation does not require a paid plan.
- The worker has no schedule and dispatch is not authorized, so queued work remains pending. GitHub Actions does not automatically retry this POST request; a later, separately authorized invocation is required to use the remaining retry budget.
- A failed workflow run can mean the endpoint was unavailable, rejected the invocation, or persisted a document-processing failure. Inspect the Actions job without exposing secrets.

## Historical non-production observations (not current acceptance)

The following observations were recorded on 2026-11-04 and must not be treated as current verification:

- The feature-branch Preview alias was `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`.
- A GET request returned `405 Method Not Allowed`, as expected for the POST-only route. This proved only the route/method response at that time.
- The branch-scoped Vercel Preview environment had a `CRON_SECRET` entry, but its encrypted value could not be compared with the GitHub Actions secret through metadata.
- Two Drive-backed PDFs completed OCR worker jobs with one attempt each. Their extracted pages remained `review_required`; this did not establish OCR accuracy, original-PDF round-trip integrity, interruption/resume behavior or human approval.
- The GitHub Actions secret values were not readable through the connected integration. Their presence and equality with Preview values were not verified by that inventory.

Do not use this historical snapshot as evidence that the current worker is operational or that live recovery is accepted.

## Owner-authorized original PDF retrieval

The document review page provides a server-mediated **View verified original PDF** link for Drive-backed uploads. The route at `GET /api/documents/[id]/original` requires an authenticated owner session and queries the document using both its ID and `auth.uid()`-backed owner ID. It returns 404 for missing or non-owned records and does not reveal another account's document existence.

Before returning bytes, the server refreshes the owner's Google Drive access token, checks Drive metadata (file ID, PDF MIME type, non-trashed state and stored size), downloads at most 50 MB, verifies the PDF signature, and compares the exact byte length and SHA-256 digest with the values recorded at upload. Responses are private and `no-store`; Google credentials and Drive file IDs are never sent to browser code. A missing checksum is treated as an integrity failure rather than silently returning an unverified file.

This implementation and its automated tests do not, by themselves, prove a live Google Drive round trip. Complete that acceptance check on the non-production Preview using an owner account and a synthetic test PDF: open the document review page, use **View verified original PDF**, and confirm that the PDF opens and is byte-for-byte the uploaded source. Also verify that a different signed-in test account receives 404 for the same document URL. Do not use real student files for this test.

## Manual recovery and state transitions

The document detail action is owner-authenticated. For a fresh running lease it refuses to start a second processor. For a stale running job with retry budget remaining, it calls the same atomic claim RPC as the worker: the database rechecks the exact observed status, attempt count and `started_at`, enforces the 15-minute threshold, increments the attempt, and moves the parent document to processing in one transaction. It does not first mark the job failed and then issue a second claim.

If the stale job has exhausted its retry budget, the manual action uses `recover_stale_document_processing_job` to mark both the job and document failed in one transaction. No further attempt is started.

Manual OCR corrections use `save_document_page_correction`, which locks the job, document and page in a consistent order and saves the corrected page plus the document's `review_required` state atomically. Corrections are refused while a worker is actively processing the document.

## Authenticated browser acceptance setup

The authenticated document and teacher acceptance job runs only when the dedicated owner test credentials are present. It runs against the connected non-production Supabase project from a local Preview-equivalent build; it does not use Production data or Google Drive.

Configure these GitHub Actions repository secrets:

| Secret | Purpose |
| --- | --- |
| `E2E_SUPABASE_URL` | URL of the designated non-production Supabase project |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | Publishable key for that same project |
| `E2E_OWNER_EMAIL` | Dedicated test-owner account email |
| `E2E_OWNER_PASSWORD` | Dedicated test-owner account password |
| `E2E_TEACHER_EMAIL` | Optional second test account for invitation and sharing tests |
| `E2E_TEACHER_PASSWORD` | Password for the dedicated test-teacher account |

Create and confirm the test accounts in the designated non-production Supabase Auth project before configuring the credentials. Do not use a personal account, a real student's account, or Production credentials. The test creates uniquely named E2E document/page/question fixtures and deletes only its own fixtures after the run.

The owner-only document review test requires the first four secrets. The two-account teacher invitation/review/revocation test additionally requires both teacher secrets. If owner credentials are missing or incomplete, CI reports the authenticated acceptance job as skipped; a skipped job is not a passing end-to-end test.

The CI workflow maps `E2E_SUPABASE_URL` and `E2E_SUPABASE_PUBLISHABLE_KEY` into the app's `NEXT_PUBLIC_*` runtime variables. Keep the E2E-prefixed GitHub secret names; do not create duplicate `NEXT_PUBLIC_*` secrets. The non-authenticated foundation checks and database tests remain separate and do not depend on these credentials.
