# Document worker deployment setup

The application includes a server-side worker at `POST /api/cron/process-documents`. It claims and processes at most one eligible job per invocation. The worker route accepts POST only and is protected by a bearer secret and uses the Supabase service-role key only on the server.

## GitHub Actions scheduler

**Important:** GitHub scheduled workflows run from the repository's default branch, not an unmerged feature branch. This workflow is committed on the feature branch but will not run on its five-minute schedule until the change is merged into the default branch. A manual `workflow_dispatch` can be used on the feature branch after configuring secrets, but only against a non-production target until acceptance is complete.

The repository workflow `.github/workflows/document-worker.yml` invokes the worker every five minutes and can also be run manually from the Actions tab. This repository uses GitHub Actions as the scheduler; it does not configure a Vercel Cron Job. Vercel Hobby's daily-only Cron restriction therefore does not govern this workflow. GitHub's schedule is best-effort and will become active only after the workflow reaches the default branch; do not add a Vercel Cron entry unless the hosting plan and schedule support it.

Configure these repository Actions secrets before enabling real processing:

| Secret | Value |
| --- | --- |
| `APP_BASE_URL` | HTTPS base URL of the deployed application, without a trailing slash |
| `CRON_SECRET` | A long random secret shared with the deployed application's `CRON_SECRET` environment variable |

The deployed application must also have the existing production environment variables required by the worker and Drive integration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DRIVE_TOKEN_ENCRYPTION_KEY` (must match the key used to encrypt saved Drive refresh tokens)

Do not put these values in source files, workflow YAML, issue comments, or logs. Do not use production credentials for test workflows.

## Operational behavior

- GitHub Actions schedules are best-effort; a scheduled run can be delayed. The queue is durable, so later invocations can continue processing.
- The workflow serializes invocations with a concurrency group and the database worker also uses a conditional claim to prevent duplicate ownership.
- Each invocation handles at most one job and has a bounded timeout.
- The worker retries eligible failed/stale jobs up to each job's configured maximum attempts.
- A failed workflow run means the endpoint was unavailable, rejected the invocation, or persisted a document-processing failure. The worker returns HTTP 500 after successfully recording a failed job so the scheduler visibly reports the failure; the durable job remains eligible for a later retry within its configured attempt budget. Inspect the Actions job without exposing secrets.
- Use `workflow_dispatch` to trigger a controlled manual run after verifying the target environment and queue.
- Live processing acceptance requires a non-production Google Drive connection and an isolated non-production Supabase project. The existing connected project `uqpyzicftxxegajaocxi` is the project's designated non-production database for this workflow; do not create a second Supabase project just for this test. Keep test records clearly identified and do not use real student data. This workflow file alone does not prove that the secrets are configured or that OCR succeeds.

### Current connected Preview setup (2026-11-04)

- The feature-branch Preview deployment is available at `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`.
- The worker endpoint is deployed on that Preview. A GET request returns `405 Method Not Allowed`, as expected for this POST-only route; this is only a route/method smoke check.
- The branch-scoped Vercel Preview environment contains a `CRON_SECRET` entry for `feature/m3-ai-solver`. Its value is encrypted and cannot be verified through environment metadata alone. Do not replace it blindly.
- The connected Supabase database contains the required `processing_jobs` and `document_pages` records. On 2026-11-04, two existing Drive-backed PDFs completed their OCR worker jobs (100% progress, one attempt each, no persisted job error). Their pages contain extracted text (1,298 and 573 characters respectively), but both remain `review_required`. This confirms a successful worker-to-Drive extraction path for those two files; it does not establish OCR accuracy or human approval.
- The GitHub Actions secret values are not readable through the connected GitHub integration. Confirm that repository secrets `APP_BASE_URL` and `CRON_SECRET` are configured without displaying their values. `APP_BASE_URL` must point to the stable feature Preview URL above, without a trailing slash. The GitHub secret `CRON_SECRET` must match the branch-scoped Preview value.
- The two completed jobs show that a worker invocation has successfully reached the Preview endpoint. Do not infer that the GitHub five-minute schedule is active: scheduled workflows run only from the repository default branch, while this workflow is on the feature branch.
- Do not enable the five-minute schedule on `main` until the endpoint, supporting application code, and database migrations have been reviewed and integrated together. A workflow-only merge could call a route that `main` does not contain.

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
