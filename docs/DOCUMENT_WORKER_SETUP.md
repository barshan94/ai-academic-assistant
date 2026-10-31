# Document worker deployment setup

The application includes a server-side worker at `GET /api/cron/process-documents`. It claims and processes at most one eligible job per invocation. The worker route is protected by a bearer secret and uses the Supabase service-role key only on the server.

## GitHub Actions scheduler

**Important:** GitHub scheduled workflows run from the repository's default branch, not an unmerged feature branch. This workflow is committed on the feature branch but will not run on its five-minute schedule until the change is merged into the default branch. A manual `workflow_dispatch` can be used on the feature branch after configuring secrets, but only against a non-production target until acceptance is complete.

The repository workflow `.github/workflows/document-worker.yml` invokes the worker every five minutes and can also be run manually from the Actions tab.

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
- A failed workflow run means the endpoint was unavailable or rejected the invocation; inspect the Actions job without exposing secrets.
- Use `workflow_dispatch` to trigger a controlled manual run after verifying the target environment and queue.
- Live processing acceptance still requires a non-production Google Drive connection and Supabase test project. This workflow file alone does not prove that the secrets are configured or that OCR succeeds.
