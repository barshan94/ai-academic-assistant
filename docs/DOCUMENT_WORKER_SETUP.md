# Document worker deployment setup

The application includes a server-side worker at `POST /api/cron/process-documents`. It claims and processes at most one eligible job per invocation. The worker route accepts POST only and is protected by a bearer secret and uses the Supabase service-role key only on the server.

## GitHub Actions invocation

**Current verified behavior:** `.github/workflows/document-worker.yml` defines `workflow_dispatch` only. It does not contain a `schedule` trigger, so it does not poll the queue automatically. A repository operator must manually dispatch it from the Actions tab. The credentialed job is additionally restricted to `feature/m3-ai-solver`, and it refuses an `APP_BASE_URL` that is not an exact stable feature-branch Preview origin (`https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`). It rejects deployment-specific hostnames, Production URLs, unrelated HTTPS origins, credentials, paths and trailing slashes. This destination allowlist does not prove that the secret matches the deployed Preview. Do not describe this workflow as scheduled until a recurring trigger is committed and verified.

If a recurring GitHub schedule is added later, GitHub runs it from the repository's default branch, not an unmerged feature branch. Integrate the worker route, application code, database migrations and scheduler together; a workflow-only merge could call a route that `main` does not contain. No Vercel Cron Job is configured. The current deployment uses Vercel Hobby, so do not assume Vercel provides a five-minute scheduler.

Configure these repository Actions secrets before enabling real processing:

| Secret | Value |
| --- | --- |
| `APP_BASE_URL` | Exact value `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app` (stable feature-branch Preview alias only) |
| `CRON_SECRET` | A long random secret of at least 32 characters, shared with the deployed application's `CRON_SECRET` environment variable; both the route and workflow reject shorter values |

The deployed application must also have the existing production environment variables required by the worker and Drive integration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DRIVE_TOKEN_ENCRYPTION_KEY` (must match the key used to encrypt saved Drive refresh tokens)

Do not put these values in source files, workflow YAML, issue comments, or logs. Do not use production credentials for test workflows.

## Operational behavior

- The current workflow is manual-dispatch only. The queue is durable, but it will not be processed automatically until a recurring scheduler is deliberately enabled.
- The workflow serializes invocations with a concurrency group and the database worker also uses a conditional claim to prevent duplicate ownership.
- Each invocation handles at most one job and has a bounded timeout.
- The worker retries eligible failed/stale jobs up to each job's configured maximum attempts.
- A failed workflow run means the endpoint was unavailable, rejected the invocation, or persisted a document-processing failure. The worker returns HTTP 500 after successfully recording a failed job so the scheduler visibly reports the failure; the durable job remains eligible for a later retry within its configured attempt budget. Inspect the Actions job without exposing secrets.
- Use `workflow_dispatch` to trigger a controlled manual run after verifying the target environment, queue, Preview secrets and test account.
- Live processing acceptance requires a non-production Google Drive connection and an isolated non-production Supabase project. The existing connected project `uqpyzicftxxegajaocxi` is the project's designated non-production database for this workflow; do not create a second Supabase project just for this test. Keep test records clearly identified and do not use real student data. This workflow file alone does not prove that the secrets are configured or that OCR succeeds.

### Current connected Preview setup (2026-11-04)

- The feature-branch Preview deployment is available at `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`.
- The worker endpoint is deployed on that Preview. A GET request returns `405 Method Not Allowed`, as expected for this POST-only route; this is only a route/method smoke check.
- The branch-scoped Vercel Preview environment contains a `CRON_SECRET` entry for `feature/m3-ai-solver`. Its value is encrypted and cannot be verified through environment metadata alone. Do not replace it blindly.
- The connected Supabase database contains the required `processing_jobs` and `document_pages` records. On 2026-11-04, two existing Drive-backed PDFs completed their OCR worker jobs (100% progress, one attempt each, no persisted job error). Their pages contain extracted text (1,298 and 573 characters respectively), but both remain `review_required`. This confirms a successful worker-to-Drive extraction path for those two files; it does not establish OCR accuracy or human approval.
- The GitHub Actions secret values are not readable through the connected GitHub integration. Confirm that repository secrets `APP_BASE_URL` and `CRON_SECRET` are configured without displaying their values. `APP_BASE_URL` must point to the stable feature Preview URL above, without a trailing slash. The GitHub secret `CRON_SECRET` must match the branch-scoped Preview value.
- The two completed jobs show that worker invocations reached the Preview endpoint at some point. The checked-in workflow is manual-dispatch only; no recurring schedule is defined or active.
- Do not enable the five-minute schedule on `main` until the endpoint, supporting application code, and database migrations have been reviewed and integrated together. A workflow-only merge could call a route that `main` does not contain.

## Owner-authorized original PDF retrieval

The document review page provides a server-mediated **View verified original PDF** link for Drive-backed uploads. The route at `GET /api/documents/[id]/original` requires an authenticated owner session and queries the document using both its ID and `auth.uid()`-backed owner ID. It returns 404 for missing or non-owned records and does not reveal another account's document existence.

Before returning bytes, the server refreshes the owner's Google Drive access token, checks Drive metadata (file ID, PDF MIME type, non-trashed state and stored size), downloads at most 50 MB, verifies the PDF signature, and compares the exact byte length and SHA-256 digest with the values recorded at upload. Responses are private and `no-store`; Google credentials and Drive file IDs are never sent to browser code. A missing checksum is treated as an integrity failure rather than silently returning an unverified file.

This implementation and its automated tests do not, by themselves, prove a live Google Drive round trip. Complete that acceptance check on the non-production Preview using an owner account and a test PDF: open the document review page, use **View verified original PDF**, and confirm that the PDF opens and is byte-for-byte the uploaded source. Also verify that a different signed-in test account receives 404 for the same document URL. Do not use real student files for this test.

## Manual recovery and state transitions

The document detail action is owner-authenticated. For a fresh running lease it refuses to start a second processor. For a stale running job with retry budget remaining, it calls the same atomic claim RPC as the scheduled worker: the database rechecks the exact observed status, attempt count and `started_at`, enforces the 15-minute threshold, increments the attempt, and moves the parent document to processing in one transaction. It does not first mark the job failed and then issue a second claim.

If the stale job has exhausted its retry budget, the manual action uses `recover_stale_document_processing_job` to mark both the job and document failed in one transaction. No further attempt is started.

Manual OCR corrections use `save_document_page_correction`, which locks the job, document and page in a consistent order and saves the corrected page plus the document's `review_required` state atomically. Corrections are refused while a worker is actively processing the document.

## Authenticated browser acceptance setup

The Authenticated document and teacher acceptance job runs only when the dedicated owner test credentials are present. It runs against the connected non-production Supabase project from a local Preview-equivalent build; it does not use production data or Google Drive.

Configure these GitHub Actions repository secrets:

| Secret | Purpose |
| --- | --- |
| `E2E_SUPABASE_URL` | URL of the designated non-production Supabase project |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | Publishable key for that same project |
| `E2E_OWNER_EMAIL` | Dedicated test-owner account email |
| `E2E_OWNER_PASSWORD` | Dedicated test-owner account password |
| `E2E_TEACHER_EMAIL` | Optional second test account for invitation and sharing tests |
| `E2E_TEACHER_PASSWORD` | Password for the dedicated test-teacher account |

Create and confirm the test accounts in the designated non-production Supabase Auth project before configuring the credentials. Do not use a personal account, a real student's account, or production credentials. The test creates uniquely named E2E document/page/question fixtures and deletes its own fixtures after the run.

The owner-only document review test requires the first four secrets. The two-account teacher invitation/review/revocation test additionally requires both teacher secrets. If owner credentials are missing or incomplete, CI reports the authenticated acceptance job as skipped; a skipped job is not a passing end-to-end test.

The CI workflow maps `E2E_SUPABASE_URL` and `E2E_SUPABASE_PUBLISHABLE_KEY` into the app's `NEXT_PUBLIC_*` runtime variables. Keep the E2E-prefixed GitHub secret names; do not create duplicate `NEXT_PUBLIC_*` secrets. The non-authenticated foundation checks and database tests remain separate and do not depend on these credentials.
