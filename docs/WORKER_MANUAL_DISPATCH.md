# Manual document-worker invocation

## Current workflow state

The default branch contains a legacy `.github/workflows/document-worker.yml`, which makes GitHub's **Run workflow** button available. That default-branch copy has no explicit confirmation input, no branch restriction and no exact Preview-origin allowlist; it accepts any HTTPS `APP_BASE_URL` before sending `CRON_SECRET`.

**Never dispatch with the `main` ref.** The legacy workflow could send the repository bearer secret to an unintended HTTPS origin if `APP_BASE_URL` is misconfigured.

The `feature/m3-ai-solver` version contains the stricter guardrails below. If a future run is separately authorized, select exactly that ref so GitHub executes the hardened branch version. This document does not authorize a run.

## Feature-branch guardrails

The document worker is intentionally **manual-only**. The feature-branch workflow must not gain a `push`, `pull_request`, or `schedule` trigger as part of routine development.

A feature-branch dispatch must satisfy all of these conditions:

1. The selected ref is exactly `feature/m3-ai-solver`.
2. The operator explicitly sets `confirm_nonprod_worker_run` to `true`. The input is required and defaults to `false`.
3. The Actions secrets `APP_BASE_URL` and `CRON_SECRET` are present.
4. `CRON_SECRET` is at least 32 characters.
5. `APP_BASE_URL` exactly matches the checked-in non-production feature Preview alias. The workflow does not accept a URL supplied as a dispatch input.
6. The request is one HTTPS POST to `/api/cron/process-documents`. The raw response is kept out of Actions logs.

The explicit confirmation is an accidental-dispatch guard, not proof that the worker is ready for operational use. It does not verify the current deployed route, hosted RPC/schema compatibility, secret equality with the Preview environment, concurrent-claim behavior, retry exhaustion, stale-lease recovery, OCR correctness, or idempotency under a lost response.

## Do not dispatch yet

The owner has prohibited worker dispatch until route/branch integration, GitHub Actions secret scope, target environment, authentication and idempotency are independently verified. The legacy `main` workflow must not be used as a fallback. Do not copy or print secret values, and do not use real student documents for any future acceptance.

No recurring schedule is authorized. Keep Production untouched and use only synthetic documents if a future, separately approved non-production test is performed.
