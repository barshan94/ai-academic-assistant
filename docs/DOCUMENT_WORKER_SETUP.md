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

- The feature branch Preview deployment is available at `https://ai-academic-assistant-git-feature-m3-ai-solver-barshan-s-team.vercel.app`.
- The worker endpoint is deployed on that Preview: a GET request reaches the route and returns `405 Method Not Allowed`, as expected because only POST is supported. This is a route/method smoke check, not proof of authenticated worker execution.
- The branch-scoped Vercel Preview environment currently has no `CRON_SECRET`. The GitHub Actions repository secrets `APP_BASE_URL` and `CRON_SECRET` are also not configured/verified.
- Use one newly generated high-entropy secret for both `CRON_SECRET` entries. Add it to the Vercel Preview environment for branch `feature/m3-ai-solver`, then add the exact same value as the GitHub repository Actions secret. Do not use a Production-scoped value for this test. Do not paste the secret into chat, commit it, or expose it in workflow logs.
- Set GitHub `APP_BASE_URL` to the stable feature-branch Preview URL above, with no trailing slash. Then use Actions → Document processing worker → Run workflow on branch `feature/m3-ai-solver` for a controlled manual run. Check the run's HTTP outcome and then verify the matching job and `document_pages` rows in Supabase.
- Do not enable the five-minute schedule on `main` until the endpoint, supporting application code, and database migrations have been reviewed and integrated together. A workflow-only merge would call a route that `main` does not currently contain.


## Manual recovery and state transitions

The document detail action is owner-authenticated. For a fresh running lease it refuses to start a second processor. For a stale running job with retry budget remaining, it calls the same atomic claim RPC as the scheduled worker: the database rechecks the exact observed status, attempt count and `started_at`, enforces the 15-minute threshold, increments the attempt, and moves the parent document to processing in one transaction. It does not first mark the job failed and then issue a second claim.

If the stale job has exhausted its retry budget, the manual action uses `recover_stale_document_processing_job` to mark both the job and document failed in one transaction. No further attempt is started.

Manual OCR corrections use `save_document_page_correction`, which locks the job, document and page in a consistent order and saves the corrected page plus the document's `review_required` state atomically. Corrections are refused while a worker is actively processing the document.
