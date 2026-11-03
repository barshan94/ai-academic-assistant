# Live non-production re-verification — 2026-11-03

This report records a fresh read-only inspection performed against the existing Supabase project `academic-assistant` (ref `uqpyzicftxxegajaocxi`) and GitHub Actions for the feature branch. It supersedes older snapshots in this repository that still describe the hosted migration ledger as 53 entries with 44 pending migrations.

## Hosted Supabase evidence

- Project is `ACTIVE_HEALTHY`, Free plan, PostgreSQL 17.11, region `ap-south-1`.
- Hosted migration ledger contains **97 entries**, latest version `20261101160000`. The previously pending 44 migrations are now represented in the hosted ledger. Do not run the migration reconciliation workflow again unless a new ledger comparison demonstrates drift.
- Public schema contains **31 base tables**; all **31/31 have RLS enabled**.
- Public schema has **50 policies across 27 tables**.
- Seeded reference syllabus data: **4 catalogues, 30 chapters, 170 topics**. These are drafts and are not independently validated/published official curriculum.
- `public.register_uploaded_document(uuid,text,bigint,text,text,text,integer)` exists. Its current function body enforces a nullable page count of 1–50. Execute privilege is false for `anon` and `authenticated`, true for `service_role`.
- The table-level `documents_page_count_check` still allows null or values >= 0. The stricter 1–50 rule is enforced by the server-only registration RPC, not by that table check. Do not describe the table constraint itself as 1–50.
- Auth contains **2 users**, but `profiles`, `documents` and `processing_jobs` each contain **0 rows**.
- Storage buckets: **0**. Deployed Supabase Edge Functions: **0**. The document worker is an application route invoked by GitHub Actions, not a Supabase Edge Function.
- The performance advisor's unused-index notices are informational while application tables are empty; do not drop indexes based on these notices.

## CI evidence on commit `cd25c72efde45f00984bb5e7d23ae59b8ca30086`

- Foundation checks: **success** — lint, app/Playwright type checks, production environment contract, production dependency audit, build and **207 unit tests across 40 files**.
- Chromium smoke: **success** — **10 passed, 1 skipped**.
- Database authorization: **success** — isolated local migration replay and **236 pgTAP assertions across 11 files**.
- Secret scanning: **success**.
- Authenticated two-account browser acceptance: **skipped**, not passed. Workflow run `41597601831` was skipped because `ENABLE_AUTHENTICATED_E2E` was not enabled at that time.

These CI checks use an isolated local database. They do not prove live Google OAuth/Drive, live AI generation, hosted two-account IDOR behavior, or a full restore.

## Authenticated E2E next step

The current test creates its own uniquely labelled document, page, question and answer fixtures using the owner account, runs the teacher invitation/review/revocation lifecycle, and cleans up those records. It does **not** require `E2E_QUESTION_ID` or `E2E_SOLUTION_ID`.

The workflow requires these six repository Actions secrets:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_PUBLISHABLE_KEY`
- `E2E_OWNER_EMAIL`
- `E2E_OWNER_PASSWORD`
- `E2E_TEACHER_EMAIL`
- `E2E_TEACHER_PASSWORD`

The owner reported entering these six secrets; their values cannot be read back through the available GitHub connection. The owner has now confirmed setting the repository Actions variable `ENABLE_AUTHENTICATED_E2E=true`. A new commit on the existing PR branch is being used to trigger the pull-request workflow because the connected GitHub integration does not expose workflow dispatch. Confirm both accounts are disposable, non-production test identities before relying on the run.

## Remaining release blockers

1. Run the authenticated two-account workflow and resolve any failures; include cross-account IDOR acceptance beyond the teacher lifecycle.
2. Configure and verify non-production deployment secrets and integrations. The latest owner-actions inventory reported the Vercel preview had Supabase URL/publishable key, but lacked service-role key, cron secret, Google OAuth client credentials and AI provider credentials; `DRIVE_TOKEN_ENCRYPTION_KEY` was present but empty. Recheck before configuring.
3. Complete real Google OAuth/Drive acceptance: connect/reconnect/disconnect, image-to-PDF, resumable upload interruption, OCR, worker scheduling/retries/recovery.
4. Select an AI provider/model only after explicit privacy, data-processing and budget approval; run and independently grade a representative golden question set. AI is disabled until credentials are configured.
5. Complete a real encrypted backup, isolated Auth-and-data restore and original-password sign-in drill. Archive integrity alone is insufficient.
6. Resolve or formally disposition ERR-124 (13 moderate findings in the full development dependency tree; production-only audit reports zero).
7. Complete manual accessibility acceptance (keyboard, NVDA, TalkBack, contrast, zoom/reflow and real Android device).
8. Complete official syllabus validation, independent academic answer grading, qualified privacy/legal review, and assign primary and backup operators.
9. Complete deployment readiness, monitoring, incident-response and release approval. Do not merge the application branch or deploy production as part of this checklist.

## Safety and scope

- Continue using only the existing Free-plan `academic-assistant` project in `ap-south-1`.
- Do not create another Supabase project or upgrade a plan.
- Do not touch `durga-map`.
- Do not merge the application feature branch or deploy production without separate explicit approval.
- A passing build, a complete migration ledger, or a READY preview deployment does not equal production acceptance.
