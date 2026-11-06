# Authenticated E2E setup

This workflow exercises real Supabase Auth and Row Level Security using two separate test accounts. It is separate from credential-free Chromium smoke tests.

## Safety requirements

- Use only the approved non-production Supabase project: `academic-assistant` (`uqpyzicftxxegajaocxi`).
- Do not use production credentials, personal accounts, or real student/customer records.
- The workflow hard-locks the Supabase URL to this project and fails if a different URL is configured.
- Ensure the project's migrations are applied before running the test.
- The test creates uniquely named document, page, question, and answer fixtures through the owner account. It cleans up the created question/document afterward; the invitation audit record is intentionally retained.
- The test uses a deterministic fixture answer and does not call an AI provider.
- Never add a Supabase service-role key.

## GitHub Actions configuration

In **Settings → Secrets and variables → Actions**, set this repository variable:

- `ENABLE_AUTHENTICATED_E2E=true`

Add these six repository Actions secrets:

| Secret | Value |
|---|---|
| `E2E_SUPABASE_URL` | `https://uqpyzicftxxegajaocxi.supabase.co` |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key for the approved non-production project |
| `E2E_OWNER_EMAIL` | Confirmed test owner account email |
| `E2E_OWNER_PASSWORD` | Test owner password |
| `E2E_TEACHER_EMAIL` | Confirmed, different test teacher account email |
| `E2E_TEACHER_PASSWORD` | Test teacher password |

The owner and teacher must be two different confirmed Auth users in the approved project. Do not share secret values in chat.

No question ID or solution ID variables are needed. The Playwright test creates those records for each run.

## Run

The workflow runs automatically for pull requests targeting `main` from `feature/m3-ai-solver`, provided the opt-in repository variable is `true`. It can also be manually dispatched from **Actions → Authenticated browser acceptance → Run workflow**.

The workflow validates all six secrets and the exact project URL, installs Chromium, builds the app, and runs `playwright.auth.config.ts`.

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

This test does not verify live AI inference, Google OAuth/Drive, upload processing, OCR quality, or official answer correctness. Those require separate acceptance work. A passing run proves only the tested two-account lifecycle against this test project's current schema and policies.
