# Authenticated E2E setup

These tests exercise the real Supabase Auth and Row Level Security paths using two separate accounts. They are intentionally separate from the credential-free Chromium smoke tests.

## Safety requirements

- Use a non-production Supabase development/test project. The existing `academic-assistant` project may be reused if it is not production and remains free of real user/student data; do not create another project just for this workflow.
- If the existing project is production or contains real user data, stop and use a separate test project instead.
- Ensure every SQL migration in `supabase/migrations/` is applied to the chosen test environment.
- Create two confirmed auth users in the test project: one owner and one teacher. Use distinct email addresses and strong test-only passwords.
- Do not use personal accounts, real student records, or production credentials.
- The test does not call an AI provider. Its answer is a fixture inserted by `supabase/e2e_seed.sql`.

## Seed the test question

1. Open the chosen non-production project's SQL Editor.
2. Open `supabase/e2e_seed.sql`, replace `OWNER_E2E_EMAIL_HERE` with the test owner's email, and run it.
3. Copy the `E2E_QUESTION_ID` and `E2E_SOLUTION_ID` values from the SQL result.

## Configure GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions**. Add the repository variable `ENABLE_AUTHENTICATED_E2E` with value `true`, then add these Actions secrets:

| Secret | Value |
|---|---|
| `E2E_SUPABASE_URL` | URL of the chosen non-production test Supabase project |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key for that test project |
| `E2E_OWNER_EMAIL` | Test owner email |
| `E2E_OWNER_PASSWORD` | Test owner password |
| `E2E_TEACHER_EMAIL` | Test teacher email |
| `E2E_TEACHER_PASSWORD` | Test teacher password |
| `E2E_QUESTION_ID` | Question ID printed by the seed SQL |
| `E2E_SOLUTION_ID` | Solution ID printed by the seed SQL |

Never add a service-role key. The workflow only needs the public key and normal user credentials.

## Run

The authenticated workflow runs on PRs targeting `main` only after `ENABLE_AUTHENTICATED_E2E=true` is set. It can also be run manually from **Actions → Authenticated browser acceptance → Run workflow** once the workflow is available on the default branch. The workflow builds the application against the test project and runs the two-account Chromium test.

The test verifies:
1. The teacher cannot read the owner's question before invitation acceptance.
2. The owner can invite the teacher to that question.
3. The teacher can accept using the exact invited account.
4. The teacher can read the seeded answer and submit correction feedback.
5. The owner can see the teacher review and revoke access.
6. The already signed-in teacher loses access after revocation.

Each run creates a new invitation and revokes it. The invitation audit record is intentionally retained. The seed question and answer remain in the test project and can be reused.

## Limits

This does not test live AI inference, Google OAuth/Drive, upload processing, or official answer quality. Those require separate acceptance tests and explicit cost/account approval. A passing run demonstrates the tested two-account workflow against the chosen test environment's currently applied migrations; it does not certify every production security path.
