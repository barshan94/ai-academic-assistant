# Manual document-worker invocation

## Current guardrails

The document worker is intentionally **manual-only**. The workflow is
`.github/workflows/document-worker.yml` and must not gain a `push`,
`pull_request`, or `schedule` trigger as part of routine development.

A dispatch must satisfy all of these conditions:

1. The selected ref is exactly `feature/m3-ai-solver`.
2. The operator explicitly sets `confirm_nonprod_worker_run` to `true`.
   The input is required and defaults to `false`.
3. The Actions secrets `APP_BASE_URL` and `CRON_SECRET` are present.
4. `CRON_SECRET` is at least 32 characters.
5. `APP_BASE_URL` exactly matches the checked-in non-production feature Preview
   alias. The workflow does not accept a URL supplied as a dispatch input.
6. The request is one HTTPS POST to `/api/cron/process-documents`. The raw
   response is kept out of Actions logs.

The explicit confirmation is an accidental-dispatch guard, not proof that the
worker is ready for operational use. It does not verify the current deployed
route, hosted RPC/schema compatibility, secret equality with the Preview
environment, concurrent-claim behavior, retry exhaustion, stale-lease
recovery, OCR correctness, or idempotency under a lost response.

## Do not dispatch yet

The owner has prohibited worker dispatch until route/branch integration,
GitHub Actions secret scope, target environment, authentication and idempotency
are independently verified. This document does not authorize a run. Do not
copy or print secret values, and do not use real student documents for any
future acceptance.

No recurring schedule is authorized. Keep Production untouched and use only
synthetic documents if a future, separately approved non-production test is
performed.
