# Authenticated E2E setup

This workflow exercises real Supabase Auth and Row Level Security using two separate test accounts. It is separate from credential-free Chromium smoke tests. Unlike local database tests, it connects to the designated non-production Supabase project and creates/deletes synthetic records. It is therefore opt-in and must not run automatically on every push or pull request.

## Safety requirements

- Use only the approved non-production Supabase project: `academic-assistant` (`uqpyzicftxxegajaocxi`).
- Do not use production credentials, personal accounts, or real student/customer records.
- The workflow hard-locks the Supabase URL to this project and fails if a different URL is configured.
- Do not apply migrations as part of this workflow. The test assumes the target schema has already been reviewed and is compatible; schema changes require a separate owner-reviewed operation.
- The test creates uniquely named document, page, question, and answer fixtures through the owner account. It deletes the fixture question/document afterward; cascades remove related answer/review rows. The invitation audit record is intentionally retained.
- A failed or interrupted run can leave synthetic fixture rows behind. Identify them by the `E2E fixture` / `E2E review fixture` filename marker and the run's unique UUID before any cleanup. Never delete rows by broad filename or owner-wide criteria.
- The test uses a deterministic fixture answer and does not call an AI provider.
- Never add a Supabase service-role key.

## GitHub Actions configuration

In **Settings → Secrets and variables → Actions**, configure these six repository Actions secrets:

| Secret | Purpose |
|---|---|
| `E2E_SUPABASE_URL` | Must equal `https://uqpyzicftxxegajaocxi.supabase.co` |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key for the approved non-production project |
| `E2E_OWNER_EMAIL` | Confirmed dedicated test-owner account email |
| `E2E_OWNER_PASSWORD` | Dedicated test-owner password |
| `E2E_TEACHER_EMAIL` | Confirmed, different test-teacher account email |
| `E2E_TEACHER_PASSWORD` | Dedicated test-teacher password |

The owner and teacher must be two different confirmed Auth users in the approved project. Do not share secret values in chat. No service-role key, question ID or solution ID variable is needed.

## Run — explicit owner action only

The workflow has **only** a `workflow_dispatch` trigger. It does not run on pushes, pull requests or a schedule.

If a human operator decides that a hosted non-production test run is appropriate:

1. Open **Actions → Authenticated browser acceptance → Run workflow**.
2. Select `feature/m3-ai-solver`.
3. Set `confirm_nonprod_mutation` to **true** only after confirming the six secrets point to the dedicated non-production test accounts and project.
4. Start the workflow.

The job is skipped unless the event is a manual dispatch, the selected ref is exactly `feature/m3-ai-solver`, and the boolean confirmation is true. The job independently validates all six secrets, distinct owner/teacher emails and the exact non-production project URL before building and running `playwright.auth.config.ts`.

Do not run this workflow as an automatic CI gate. A skipped run is not a passing authenticated acceptance test. No workflow dispatch is performed by routine branch updates.

## Assertions

The two-account test verifies:

1. The teacher cannot read the owner's document, page, question, or answer before invitation.
2. The owner can invite the teacher to the question.
3. The teacher accepts the invitation with the invited account.
4. The teacher can read the question and answer but not the original source document/page.
5. The teacher can submit review decisions and correction feedback.
6. The owner can see the review and revoke access.
7. The already signed-in teacher loses page and Data API access after revocation.

## Limits

This test does not verify live AI inference, Google OAuth/Drive, upload processing, OCR quality, or official answer correctness. Those require separate acceptance work. A passing run proves only the tested two-account lifecycle against this test project's schema and policies. It does not prove Production readiness.

## Historical evidence

On commit `f39a165fd1a200ddd5f8c5dc932c16a50990c119`, the actual two-account acceptance step passed in [GitHub Actions run 42635575501](https://github.com/barshan94/ai-academic-assistant/actions/runs/42635575501). This is historical evidence for that exact commit only; it is not a result for the current branch head.
