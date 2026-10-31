# Engineering Error Log

This file records material implementation, CI, integration and release problems encountered in this project. Add new entries rather than erasing history. Never include credentials, private student data, OAuth tokens or sensitive payloads.

## Error record format
- ID / date
- Area
- Symptom
- Root cause
- Fix
- Verification
- Status / remaining limitation

## ERR-001 — GitHub Actions database port collision
- Date: 2026-10-30
- Area: CI / local Supabase
- Symptom: Database workflow could not start because default PostgreSQL port 54322 was already occupied on the GitHub runner.
- Root cause: Workflow assumed the default local Supabase port was free.
- Fix: Override database port to 55432 and shadow database port to 55430 after Supabase initialization.
- Verification: Isolated database startup and migrations passed in https://github.com/barshan94/ai-academic-assistant/actions/runs/41189616384.
- Status: Fixed and verified in CI.

## ERR-002 — Malformed dollar-quote delimiters in authorization SQL
- Date: 2026-10-30
- Area: PostgreSQL / pgTAP
- Symptom: Question-solution access test failed to parse SQL near invitation/solution mutation cases.
- Root cause: Several SQL statements used malformed or mismatched dollar-quote delimiters, including $insert, $$$insert and inconsistent update/delete delimiters.
- Fix: Normalized SQL delimiters to balanced $$ blocks and retained 15 authorization assertions.
- Verification: Static delimiter/assertion checks passed; combined database workflow passed in https://github.com/barshan94/ai-academic-assistant/actions/runs/41189616384.
- Status: Fixed and verified in CI.

## ERR-003 — Practice queue expected-count mismatch
- Date: 2026-10-30
- Area: Database tests / M7
- Symptom: Practice queue test expected a different count than the seeded fixture and query filters returned.
- Root cause: Assertion expected count did not match fixture/query semantics.
- Fix: Corrected expected count.
- Verification: All 29 M7 study-feature pgTAP assertions passed in run 41189469872; latest combined database workflow also passed.
- Status: Fixed and verified in CI.

## ERR-004 — Interrupted document jobs remained marked running
- Date: 2026-10-31
- Area: M2 document processing / recovery
- Symptom: A request/server interruption after claiming a job could leave it running indefinitely; later attempts returned already_processing.
- Root cause: Job claiming existed without stale-running recovery.
- Fix: Added 15-minute stale detection. Recovery updates only a job whose status is still running and whose started_at still matches the originally read value. The existing retry-limit and claim path then applies. The document list exposes a recovery/check action.
- Verification: Unit tests cover stale, fresh, missing, invalid, future and custom-threshold timestamps. CI pending for this commit.
- Status: Implemented; verification pending. This is user-triggered recovery, not a durable scheduled worker.

## ERR-005 — Authenticated two-account acceptance skipped
- Date: 2026-10-31
- Area: Authenticated browser E2E
- Symptom: Two-account Supabase acceptance workflow skipped.
- Root cause: Dedicated non-production test-project credentials and enablement variable are not configured in GitHub Actions.
- Fix: Exact setup and secret names are documented in docs/AUTHENTICATED_E2E_SETUP.md. No production credentials or fabricated accounts are used.
- Verification: Workflow reports skipped when required environment is absent.
- Status: Blocked on owner-provided non-production test project and accounts; not a passing test.

## ERR-006 — Vercel deployment blocked by account deployment limit
- Date: 2026-10-30
- Area: Preview deployment
- Symptom: Deployment could not start because account/team deployment limit was reached.
- Root cause: Platform quota/rate limit, not an application build failure.
- Fix: Continue GitHub CI validation; retry preview after quota resets or changes.
- Verification: GitHub production build passed independently.
- Status: External blocker; deployment not verified.

## ERR-007 — Remote Supabase migration history version drift
- Date: 2026-10-31
- Area: Database migration operations
- Symptom: Two shared-reference migration filenames have timestamp versions that differ from remote migration history entries.
- Root cause: Local migration files and remote migration ledger use different timestamp identifiers.
- Fix: Do not blindly apply migrations or rewrite remote history. Reconcile exact schema and ledger against a confirmed non-production environment before applying pending M7 migrations.
- Verification: Isolated local Supabase migrations pass. Remote migration ledger was not modified.
- Status: Open; remote schema alignment unverified.

## ERR-008 — Chromium browser smoke test pending
- Date: 2026-10-31
- Area: Browser CI
- Symptom: Chromium job was still installing Chromium at the checkpoint.
- Root cause: No failure established; browser install/build/test had not completed.
- Fix: Await workflow result and inspect logs if it fails. Never classify an in-progress job as a pass.
- Verification: Pending.
- Status: Pending CI result.

## Known unverified areas
- Live Google OAuth/Drive acceptance and upload/OCR with an authorized account.
- Live Google OAuth/Drive acceptance, including resumable uploads up to 50 MB, interruption recovery and session expiry.
- Durable background worker with automatic retry scheduling and operational monitoring; code is implemented but live deployment acceptance is pending.
- Live AI provider inference and cost-controlled golden-set grading.
- Two-account teacher and cross-account database acceptance on a dedicated non-production Supabase project.
- Real official syllabus curation and independent source validation.
- Backup/restore, accessibility, mobile usability, performance and release acceptance.

## ERR-009 — Reprocessing could delete saved questions linked to document pages

- Date: 2026-10-31
- Area: M2 document processing / data integrity
- Symptom: The previous reprocessing flow deleted every document-page row before inserting newly extracted pages. The questions table uses an ON DELETE CASCADE relationship to document pages, so a retry could silently delete saved questions. Immutable chapter-note page references can also reject page deletion.
- Root cause: Reprocessing treated extracted pages as disposable cache rows even though other academic records depend on their stable IDs.
- Fix: Before claiming a processing job, the route now checks whether existing document pages are referenced by saved questions or chapter-note sources. If any dependency exists, reprocessing is refused before any page or job mutation and the UI explains that a new document version must be uploaded. If the dependency check fails, processing is also refused safely.
- Verification: Added pure unit tests for zero references, question references, note references and both reference types. Full CI is pending for this commit.
- Status: Implemented; CI verification pending. This protects linked academic data but does not yet provide a first-class document versioning/revision workflow.

## ERR-010 — Document processing depended on a user keeping the browser request alive

- Date: 2026-10-31
- Area: M2 background processing / reliability
- Symptom: Document processing was initiated through a user-facing POST request and could be interrupted by browser navigation, request timeouts or serverless execution limits.
- Root cause: The durable job table existed, but there was no scheduled worker independently consuming it.
- Fix: Added an authenticated scheduled server route that uses a server-only Supabase service-role client, atomically claims one queued/failed/stale job at a time, refreshes the owning user's encrypted Google Drive token, processes OCR, records success/failure, retries within each row's max_attempts, and reclaims running jobs older than 15 minutes. Added a five-minute GitHub Actions scheduled workflow and deployment/setup documentation. The initial Vercel cron expression was removed after checking current plan limits: Vercel Hobby supports only daily cron execution, while more frequent schedules require Pro or Enterprise.
- Verification: Added unit tests for retry-budget and claim eligibility policy. Full CI and real deployment/integration verification are pending. The worker requires CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and the same DRIVE_TOKEN_ENCRYPTION_KEY used for stored tokens.
- Status: Implemented in code; not operationally verified. The deployment scheduler must support the configured five-minute cadence, and the non-production secrets plus live Google Drive acceptance must be configured before this can be marked complete.

## ERR-011 — Protected-route browser smoke test contained an invalid regular expression

- Date: 2026-10-31
- Area: CI / Playwright smoke tests
- Symptom: Foundation workflow failed at ESLint parsing `e2e/smoke.spec.ts` line 44 with an invalid-character parsing error.
- Root cause: The route assertion used doubled backslashes inside a regular-expression literal, so the slash delimiter was not escaped correctly.
- Fix: Corrected the expression to match the literal `/login?error=configuration` route.
- Verification: ESLint passed in foundation run 41191435476 after the correction.
- Status: Fixed and verified by ESLint.

## ERR-012 — Single-request document upload could not support larger PDFs reliably

- Date: 2026-10-31
- Area: M2 document intake / upload reliability
- Symptom: The original upload sent the entire multipart document through one Next.js request and enforced a 4 MB combined limit, making larger PDFs and interrupted uploads unsupported.
- Root cause: The archive route used a single multipart Google Drive upload and had no resumable session or chunk offset recovery.
- Fix: Added browser-side normalization, a 50 MB file limit, Google Drive resumable session initiation, 1 MB chunk uploads (256 KB-aligned), AES-256-GCM encrypted owner-bound session tokens, server-side session validation and Google-confirmed byte offsets. The document and processing job are registered only after Drive reports completion. Added pure protocol tests for range parsing and chunk boundaries.
- Verification: Unit tests and full CI for the implementation are pending. Live Drive upload, interrupted network recovery, session expiry and cross-account tests require a configured non-production Google/Supabase environment.
- Status: Implemented in code; not yet verified against a live Google Drive account.

## ERR-013 — WebCrypto and Blob typed-array buffer incompatibility

- Date: 2026-10-31
- Area: M2 resumable upload / TypeScript
- Symptom: TypeScript rejected the browser's Uint8Array<ArrayBufferLike> as a WebCrypto BufferSource and rejected typed-array test fixtures as BlobPart.
- Root cause: Newer TypeScript typed-array generics distinguish ArrayBufferLike from the ArrayBuffer-only types accepted by these Web APIs.
- Fix: Copy the upload bytes into a fresh Uint8Array and pass its ArrayBuffer to crypto.subtle.digest; similarly copy test fixture bytes and pass the resulting ArrayBuffer to File.
- Verification: Application type-check passed in foundation run 41191435476.
- Status: Fixed and type-checked.

## ERR-014 — Legacy normalization test retained the obsolete 4 MB expectation

- Date: 2026-10-31
- Area: M2 upload tests
- Symptom: Unit tests failed because tests/document-normalization.test.ts still expected the former 4 MB error message after the supported limit increased to 50 MB.
- Root cause: The new normalization tests were updated, but an older duplicate test suite was not updated in the same change.
- Fix: Updated the legacy test to assert the 50 MB limit and replaced a 50 MB in-memory fixture with a small File-shaped object whose declared size exceeds the limit, avoiding unnecessary allocation.
- Verification: New foundation CI run is pending.
- Status: Fixed in code; unit-test verification pending.

## ERR-013 — Resumable upload implementation was not wired into the page and legacy size test failed

- Date: 2026-10-31
- Area: M2 document intake / UI and CI
- Symptom: CI showed the resumable upload component was unused, the documents page still posted to the removed single-request endpoint, and one legacy normalization test expected the old 4 MB error message.
- Root cause: The page's existing JSX did not match the replacement pattern used during the initial component integration; the legacy test was outside the newly added test file and retained its old assertion.
- Fix: Replaced the old form with the resumable client component and updated the legacy test to assert the 50 MB limit. Added a bounded request-body reader so the server rejects chunks larger than 1 MB before allocating the full request body.
- Verification: Earlier CI established ESLint and both TypeScript checks pass; the unit-test failure was isolated to the stale assertion (101 tests passed, 1 failed). The corrected test, page wiring and bounded-body tests await a fresh full CI run.
- Status: Code corrected; final CI verification pending.

## ERR-015 — Five-minute Vercel cron is incompatible with Hobby plan limits

- Date: 2026-10-31
- Area: M2 background worker scheduling / deployment compatibility
- Symptom: The initial worker schedule used a five-minute Vercel cron expression, which would fail deployment on Vercel Hobby.
- Root cause: Vercel Hobby cron jobs are limited to once per day; schedules more frequent than daily require Pro or Enterprise.
- Fix: Removed the Vercel cron configuration and added the single canonical GitHub Actions workflow at `.github/workflows/document-worker.yml`, scheduled every five minutes. It calls the authenticated worker endpoint using repository secrets APP_BASE_URL and CRON_SECRET. Duplicate scheduler definitions were removed, and setup documentation explains that scheduled workflows activate only from the default branch.
- Verification: Workflow syntax and live scheduled execution remain pending; it cannot run on a schedule from this feature branch before an authorized merge to the default branch.
- Status: Code implemented; activation awaits default-branch merge and APP_BASE_URL/CRON_SECRET plus deployed worker environment configuration. No deployment or merge was performed.

## ERR-014 — Vercel Hobby cron frequency was unsupported

- Date: 2026-10-31
- Area: M2 background processing / scheduler
- Symptom: The initial Vercel cron configuration attempted to invoke the document worker every five minutes, a frequency unsupported by the project's Vercel Hobby plan.
- Root cause: The chosen hosting plan does not support the requested frequent cron schedule.
- Fix: Removed the unsupported Vercel cron configuration and added a GitHub Actions scheduled/manual workflow. It calls the HTTPS worker endpoint with a bearer secret, serializes scheduled invocations, bounds request duration and retries transient network failures. Added a deployment setup guide.
- Verification: Workflow YAML and end-to-end invocation are awaiting CI and configured non-production secrets. No live worker invocation has been claimed.
- Status: Superseded by ERR-015, which records the final canonical workflow and secret names. The worker remains unverified until non-production secrets and a deployment are configured.


## ERR-016 — Cross-account RLS test verified deletion under the wrong JWT

- Date: 2026-10-31
- Area: Database authorization tests / M2
- Symptom: The test reported that another account had deleted an owner's document page, even though the page was merely invisible under the other account's RLS context.
- Root cause: The assertion queried the page count before switching the simulated JWT back to the resource owner. RLS correctly returned zero rows to the other account, so the assertion did not distinguish invisibility from deletion.
- Fix: Keep the attempted mutation under the second account, then switch the request JWT back to the owner before asserting that the original page and document values remain unchanged. The test now checks the protected record from the principal that is allowed to see it.
- Verification: All 62 pgTAP assertions across document intake, question solutions and study features passed in GitHub Actions run 41192293698. Lint, type-check, unit tests, build and Chromium browser smoke also passed in foundation run 41192293876.
- Status: Fixed and verified. Authenticated two-account browser acceptance remains skipped because dedicated non-production credentials are not configured.


## ERR-017 — Document reprocessing could destroy the previous extraction on a failed insert

- Date: 2026-10-31
- Area: M2 document processing / data integrity
- Symptom: Both the user-triggered route and background worker deleted existing extracted page rows, then inserted replacement rows in a separate database request. If the insert failed after deletion, the document could lose its previous extraction. The question-to-page foreign key also used ON DELETE CASCADE, so a page deletion could cascade into saved questions if an application-side reference check was bypassed or raced.
- Root cause: Page replacement was implemented as multiple independent PostgREST operations, and the foreign key encoded destructive cascade semantics for a page that can be an academic source.
- Fix: Added the Supabase-CLI-generated migration 20261031103244_atomic_document_page_replacement.sql. It changes the question-to-page FK to ON DELETE RESTRICT and adds the owner-checked, SECURITY INVOKER RPC replace_document_pages. The RPC validates the page payload, locks the owning document row, checks question and chapter-note references, replaces all pages, and updates the document page count in one transaction. Both processing routes now call this RPC. The RPC is executable only by authenticated owners and the trusted service role.
- Verification: Local Supabase applied every migration successfully. All 71 pgTAP assertions passed in GitHub Actions run 41193654822, including replacement success, reference protection, invalid payload rollback, cross-account denial and direct FK deletion protection. Foundation checks passed in run 41193654883: ESLint, application and Playwright type checks, unit tests, production build and Chromium smoke tests.
- Status: Implemented and locally/CI verified. Live hosted migration has not been applied; authenticated two-account acceptance and live worker/Drive integration remain pending.

## ERR-018 — New atomic page-replacement RPC was missing from the TypeScript database schema

- Date: 2026-10-31
- Area: M2 database integration / TypeScript
- Symptom: TypeScript rejected supabase.rpc("replace_document_pages", ...) because the typed public Functions map did not contain the new RPC.
- Root cause: The migration and route calls were added, but the checked-in generated database type file had not yet been updated.
- Fix: Added the RPC argument and return types to types/database.ts, matching the SQL signature (uuid, uuid, jsonb → integer).
- Verification: Application type-check, Playwright configuration type-check and authenticated acceptance type-check passed in foundation run 41193654883.
- Status: Fixed and verified.

## ERR-019 — Atomic replacement pgTAP test contained malformed dollar quoting and a stale fixture count

- Date: 2026-10-31
- Area: M2 database authorization test suite
- Symptom: The first test run stopped parsing the new throws_ok SQL strings; after correcting those, a later direct-delete assertion still had a malformed dollar delimiter. The owner-document read assertion also expected one document after a second fixture document had been added.
- Root cause: The new test SQL used incomplete dollar-quote delimiters in several assertions, and one pre-existing count assertion was not scoped to the original document ID after the fixture expanded.
- Fix: Standardized the new SQL literals on the explicit $sql$...$sql$ delimiter and scoped the owner-document assertion to its fixture ID. Added direct FK protection and question-preservation assertions.
- Verification: All 27 document-intake assertions and all 44 existing question-solution/study-feature assertions passed (71 total) in database run 41193654822.
- Status: Fixed and verified.


## ERR-020 — Teacher-revocation regression test used malformed SQL delimiters

- Date: 2026-10-31
- Area: M4 teacher review permissions / pgTAP
- Symptom: The new test intended to verify that a revoked teacher loses access to a question and solution failed to parse; pgTAP stopped after 14 of the planned 20 assertions.
- Root cause: A bulk delimiter correction accidentally changed some existing paired `$` delimiters to `$# Engineering Error Log

This file records material implementation, CI, integration and release problems encountered in this project. Add new entries rather than erasing history. Never include credentials, private student data, OAuth tokens or sensitive payloads.

## Error record format
- ID / date
- Area
- Symptom
- Root cause
- Fix
- Verification
- Status / remaining limitation

## ERR-001 — GitHub Actions database port collision
- Date: 2026-10-30
- Area: CI / local Supabase
- Symptom: Database workflow could not start because default PostgreSQL port 54322 was already occupied on the GitHub runner.
- Root cause: Workflow assumed the default local Supabase port was free.
- Fix: Override database port to 55432 and shadow database port to 55430 after Supabase initialization.
- Verification: Isolated database startup and migrations passed in https://github.com/barshan94/ai-academic-assistant/actions/runs/41189616384.
- Status: Fixed and verified in CI.

## ERR-002 — Malformed dollar-quote delimiters in authorization SQL
- Date: 2026-10-30
- Area: PostgreSQL / pgTAP
- Symptom: Question-solution access test failed to parse SQL near invitation/solution mutation cases.
- Root cause: Several SQL statements used malformed or mismatched dollar-quote delimiters, including $insert, $$$insert and inconsistent update/delete delimiters.
- Fix: Normalized SQL delimiters to balanced $$ blocks and retained 15 authorization assertions.
- Verification: Static delimiter/assertion checks passed; combined database workflow passed in https://github.com/barshan94/ai-academic-assistant/actions/runs/41189616384.
- Status: Fixed and verified in CI.

## ERR-003 — Practice queue expected-count mismatch
- Date: 2026-10-30
- Area: Database tests / M7
- Symptom: Practice queue test expected a different count than the seeded fixture and query filters returned.
- Root cause: Assertion expected count did not match fixture/query semantics.
- Fix: Corrected expected count.
- Verification: All 29 M7 study-feature pgTAP assertions passed in run 41189469872; latest combined database workflow also passed.
- Status: Fixed and verified in CI.

## ERR-004 — Interrupted document jobs remained marked running
- Date: 2026-10-31
- Area: M2 document processing / recovery
- Symptom: A request/server interruption after claiming a job could leave it running indefinitely; later attempts returned already_processing.
- Root cause: Job claiming existed without stale-running recovery.
- Fix: Added 15-minute stale detection. Recovery updates only a job whose status is still running and whose started_at still matches the originally read value. The existing retry-limit and claim path then applies. The document list exposes a recovery/check action.
- Verification: Unit tests cover stale, fresh, missing, invalid, future and custom-threshold timestamps. CI pending for this commit.
- Status: Implemented; verification pending. This is user-triggered recovery, not a durable scheduled worker.

## ERR-005 — Authenticated two-account acceptance skipped
- Date: 2026-10-31
- Area: Authenticated browser E2E
- Symptom: Two-account Supabase acceptance workflow skipped.
- Root cause: Dedicated non-production test-project credentials and enablement variable are not configured in GitHub Actions.
- Fix: Exact setup and secret names are documented in docs/AUTHENTICATED_E2E_SETUP.md. No production credentials or fabricated accounts are used.
- Verification: Workflow reports skipped when required environment is absent.
- Status: Blocked on owner-provided non-production test project and accounts; not a passing test.

## ERR-006 — Vercel deployment blocked by account deployment limit
- Date: 2026-10-30
- Area: Preview deployment
- Symptom: Deployment could not start because account/team deployment limit was reached.
- Root cause: Platform quota/rate limit, not an application build failure.
- Fix: Continue GitHub CI validation; retry preview after quota resets or changes.
- Verification: GitHub production build passed independently.
- Status: External blocker; deployment not verified.

## ERR-007 — Remote Supabase migration history version drift
- Date: 2026-10-31
- Area: Database migration operations
- Symptom: Two shared-reference migration filenames have timestamp versions that differ from remote migration history entries.
- Root cause: Local migration files and remote migration ledger use different timestamp identifiers.
- Fix: Do not blindly apply migrations or rewrite remote history. Reconcile exact schema and ledger against a confirmed non-production environment before applying pending M7 migrations.
- Verification: Isolated local Supabase migrations pass. Remote migration ledger was not modified.
- Status: Open; remote schema alignment unverified.

## ERR-008 — Chromium browser smoke test pending
- Date: 2026-10-31
- Area: Browser CI
- Symptom: Chromium job was still installing Chromium at the checkpoint.
- Root cause: No failure established; browser install/build/test had not completed.
- Fix: Await workflow result and inspect logs if it fails. Never classify an in-progress job as a pass.
- Verification: Pending.
- Status: Pending CI result.

## Known unverified areas
- Live Google OAuth/Drive acceptance and upload/OCR with an authorized account.
- Live Google OAuth/Drive acceptance, including resumable uploads up to 50 MB, interruption recovery and session expiry.
- Durable background worker with automatic retry scheduling and operational monitoring; code is implemented but live deployment acceptance is pending.
- Live AI provider inference and cost-controlled golden-set grading.
- Two-account teacher and cross-account database acceptance on a dedicated non-production Supabase project.
- Real official syllabus curation and independent source validation.
- Backup/restore, accessibility, mobile usability, performance and release acceptance.

## ERR-009 — Reprocessing could delete saved questions linked to document pages

- Date: 2026-10-31
- Area: M2 document processing / data integrity
- Symptom: The previous reprocessing flow deleted every document-page row before inserting newly extracted pages. The questions table uses an ON DELETE CASCADE relationship to document pages, so a retry could silently delete saved questions. Immutable chapter-note page references can also reject page deletion.
- Root cause: Reprocessing treated extracted pages as disposable cache rows even though other academic records depend on their stable IDs.
- Fix: Before claiming a processing job, the route now checks whether existing document pages are referenced by saved questions or chapter-note sources. If any dependency exists, reprocessing is refused before any page or job mutation and the UI explains that a new document version must be uploaded. If the dependency check fails, processing is also refused safely.
- Verification: Added pure unit tests for zero references, question references, note references and both reference types. Full CI is pending for this commit.
- Status: Implemented; CI verification pending. This protects linked academic data but does not yet provide a first-class document versioning/revision workflow.

## ERR-010 — Document processing depended on a user keeping the browser request alive

- Date: 2026-10-31
- Area: M2 background processing / reliability
- Symptom: Document processing was initiated through a user-facing POST request and could be interrupted by browser navigation, request timeouts or serverless execution limits.
- Root cause: The durable job table existed, but there was no scheduled worker independently consuming it.
- Fix: Added an authenticated scheduled server route that uses a server-only Supabase service-role client, atomically claims one queued/failed/stale job at a time, refreshes the owning user's encrypted Google Drive token, processes OCR, records success/failure, retries within each row's max_attempts, and reclaims running jobs older than 15 minutes. Added a five-minute GitHub Actions scheduled workflow and deployment/setup documentation. The initial Vercel cron expression was removed after checking current plan limits: Vercel Hobby supports only daily cron execution, while more frequent schedules require Pro or Enterprise.
- Verification: Added unit tests for retry-budget and claim eligibility policy. Full CI and real deployment/integration verification are pending. The worker requires CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and the same DRIVE_TOKEN_ENCRYPTION_KEY used for stored tokens.
- Status: Implemented in code; not operationally verified. The deployment scheduler must support the configured five-minute cadence, and the non-production secrets plus live Google Drive acceptance must be configured before this can be marked complete.

## ERR-011 — Protected-route browser smoke test contained an invalid regular expression

- Date: 2026-10-31
- Area: CI / Playwright smoke tests
- Symptom: Foundation workflow failed at ESLint parsing `e2e/smoke.spec.ts` line 44 with an invalid-character parsing error.
- Root cause: The route assertion used doubled backslashes inside a regular-expression literal, so the slash delimiter was not escaped correctly.
- Fix: Corrected the expression to match the literal `/login?error=configuration` route.
- Verification: ESLint passed in foundation run 41191435476 after the correction.
- Status: Fixed and verified by ESLint.

## ERR-012 — Single-request document upload could not support larger PDFs reliably

- Date: 2026-10-31
- Area: M2 document intake / upload reliability
- Symptom: The original upload sent the entire multipart document through one Next.js request and enforced a 4 MB combined limit, making larger PDFs and interrupted uploads unsupported.
- Root cause: The archive route used a single multipart Google Drive upload and had no resumable session or chunk offset recovery.
- Fix: Added browser-side normalization, a 50 MB file limit, Google Drive resumable session initiation, 1 MB chunk uploads (256 KB-aligned), AES-256-GCM encrypted owner-bound session tokens, server-side session validation and Google-confirmed byte offsets. The document and processing job are registered only after Drive reports completion. Added pure protocol tests for range parsing and chunk boundaries.
- Verification: Unit tests and full CI for the implementation are pending. Live Drive upload, interrupted network recovery, session expiry and cross-account tests require a configured non-production Google/Supabase environment.
- Status: Implemented in code; not yet verified against a live Google Drive account.

## ERR-013 — WebCrypto and Blob typed-array buffer incompatibility

- Date: 2026-10-31
- Area: M2 resumable upload / TypeScript
- Symptom: TypeScript rejected the browser's Uint8Array<ArrayBufferLike> as a WebCrypto BufferSource and rejected typed-array test fixtures as BlobPart.
- Root cause: Newer TypeScript typed-array generics distinguish ArrayBufferLike from the ArrayBuffer-only types accepted by these Web APIs.
- Fix: Copy the upload bytes into a fresh Uint8Array and pass its ArrayBuffer to crypto.subtle.digest; similarly copy test fixture bytes and pass the resulting ArrayBuffer to File.
- Verification: Application type-check passed in foundation run 41191435476.
- Status: Fixed and type-checked.

## ERR-014 — Legacy normalization test retained the obsolete 4 MB expectation

- Date: 2026-10-31
- Area: M2 upload tests
- Symptom: Unit tests failed because tests/document-normalization.test.ts still expected the former 4 MB error message after the supported limit increased to 50 MB.
- Root cause: The new normalization tests were updated, but an older duplicate test suite was not updated in the same change.
- Fix: Updated the legacy test to assert the 50 MB limit and replaced a 50 MB in-memory fixture with a small File-shaped object whose declared size exceeds the limit, avoiding unnecessary allocation.
- Verification: New foundation CI run is pending.
- Status: Fixed in code; unit-test verification pending.

## ERR-013 — Resumable upload implementation was not wired into the page and legacy size test failed

- Date: 2026-10-31
- Area: M2 document intake / UI and CI
- Symptom: CI showed the resumable upload component was unused, the documents page still posted to the removed single-request endpoint, and one legacy normalization test expected the old 4 MB error message.
- Root cause: The page's existing JSX did not match the replacement pattern used during the initial component integration; the legacy test was outside the newly added test file and retained its old assertion.
- Fix: Replaced the old form with the resumable client component and updated the legacy test to assert the 50 MB limit. Added a bounded request-body reader so the server rejects chunks larger than 1 MB before allocating the full request body.
- Verification: Earlier CI established ESLint and both TypeScript checks pass; the unit-test failure was isolated to the stale assertion (101 tests passed, 1 failed). The corrected test, page wiring and bounded-body tests await a fresh full CI run.
- Status: Code corrected; final CI verification pending.

## ERR-015 — Five-minute Vercel cron is incompatible with Hobby plan limits

- Date: 2026-10-31
- Area: M2 background worker scheduling / deployment compatibility
- Symptom: The initial worker schedule used a five-minute Vercel cron expression, which would fail deployment on Vercel Hobby.
- Root cause: Vercel Hobby cron jobs are limited to once per day; schedules more frequent than daily require Pro or Enterprise.
- Fix: Removed the Vercel cron configuration and added the single canonical GitHub Actions workflow at `.github/workflows/document-worker.yml`, scheduled every five minutes. It calls the authenticated worker endpoint using repository secrets APP_BASE_URL and CRON_SECRET. Duplicate scheduler definitions were removed, and setup documentation explains that scheduled workflows activate only from the default branch.
- Verification: Workflow syntax and live scheduled execution remain pending; it cannot run on a schedule from this feature branch before an authorized merge to the default branch.
- Status: Code implemented; activation awaits default-branch merge and APP_BASE_URL/CRON_SECRET plus deployed worker environment configuration. No deployment or merge was performed.

## ERR-014 — Vercel Hobby cron frequency was unsupported

- Date: 2026-10-31
- Area: M2 background processing / scheduler
- Symptom: The initial Vercel cron configuration attempted to invoke the document worker every five minutes, a frequency unsupported by the project's Vercel Hobby plan.
- Root cause: The chosen hosting plan does not support the requested frequent cron schedule.
- Fix: Removed the unsupported Vercel cron configuration and added a GitHub Actions scheduled/manual workflow. It calls the HTTPS worker endpoint with a bearer secret, serializes scheduled invocations, bounds request duration and retries transient network failures. Added a deployment setup guide.
- Verification: Workflow YAML and end-to-end invocation are awaiting CI and configured non-production secrets. No live worker invocation has been claimed.
- Status: Superseded by ERR-015, which records the final canonical workflow and secret names. The worker remains unverified until non-production secrets and a deployment are configured.


## ERR-016 — Cross-account RLS test verified deletion under the wrong JWT

- Date: 2026-10-31
- Area: Database authorization tests / M2
- Symptom: The test reported that another account had deleted an owner's document page, even though the page was merely invisible under the other account's RLS context.
- Root cause: The assertion queried the page count before switching the simulated JWT back to the resource owner. RLS correctly returned zero rows to the other account, so the assertion did not distinguish invisibility from deletion.
- Fix: Keep the attempted mutation under the second account, then switch the request JWT back to the owner before asserting that the original page and document values remain unchanged. The test now checks the protected record from the principal that is allowed to see it.
- Verification: All 62 pgTAP assertions across document intake, question solutions and study features passed in GitHub Actions run 41192293698. Lint, type-check, unit tests, build and Chromium browser smoke also passed in foundation run 41192293876.
- Status: Fixed and verified. Authenticated two-account browser acceptance remains skipped because dedicated non-production credentials are not configured.


## ERR-017 — Document reprocessing could destroy the previous extraction on a failed insert

- Date: 2026-10-31
- Area: M2 document processing / data integrity
- Symptom: Both the user-triggered route and background worker deleted existing extracted page rows, then inserted replacement rows in a separate database request. If the insert failed after deletion, the document could lose its previous extraction. The question-to-page foreign key also used ON DELETE CASCADE, so a page deletion could cascade into saved questions if an application-side reference check was bypassed or raced.
- Root cause: Page replacement was implemented as multiple independent PostgREST operations, and the foreign key encoded destructive cascade semantics for a page that can be an academic source.
- Fix: Added the Supabase-CLI-generated migration 20261031103244_atomic_document_page_replacement.sql. It changes the question-to-page FK to ON DELETE RESTRICT and adds the owner-checked, SECURITY INVOKER RPC replace_document_pages. The RPC validates the page payload, locks the owning document row, checks question and chapter-note references, replaces all pages, and updates the document page count in one transaction. Both processing routes now call this RPC. The RPC is executable only by authenticated owners and the trusted service role.
- Verification: Local Supabase applied every migration successfully. All 71 pgTAP assertions passed in GitHub Actions run 41193654822, including replacement success, reference protection, invalid payload rollback, cross-account denial and direct FK deletion protection. Foundation checks passed in run 41193654883: ESLint, application and Playwright type checks, unit tests, production build and Chromium smoke tests.
- Status: Implemented and locally/CI verified. Live hosted migration has not been applied; authenticated two-account acceptance and live worker/Drive integration remain pending.

## ERR-018 — New atomic page-replacement RPC was missing from the TypeScript database schema

- Date: 2026-10-31
- Area: M2 database integration / TypeScript
- Symptom: TypeScript rejected supabase.rpc("replace_document_pages", ...) because the typed public Functions map did not contain the new RPC.
- Root cause: The migration and route calls were added, but the checked-in generated database type file had not yet been updated.
- Fix: Added the RPC argument and return types to types/database.ts, matching the SQL signature (uuid, uuid, jsonb → integer).
- Verification: Application type-check, Playwright configuration type-check and authenticated acceptance type-check passed in foundation run 41193654883.
- Status: Fixed and verified.

## ERR-019 — Atomic replacement pgTAP test contained malformed dollar quoting and a stale fixture count

- Date: 2026-10-31
- Area: M2 database authorization test suite
- Symptom: The first test run stopped parsing the new throws_ok SQL strings; after correcting those, a later direct-delete assertion still had a malformed dollar delimiter. The owner-document read assertion also expected one document after a second fixture document had been added.
- Root cause: The new test SQL used incomplete dollar-quote delimiters in several assertions, and one pre-existing count assertion was not scoped to the original document ID after the fixture expanded.
- Fix: Standardized the new SQL literals on the explicit $sql$...$sql$ delimiter and scoped the owner-document assertion to its fixture ID. Added direct FK protection and question-preservation assertions.
- Verification: All 27 document-intake assertions and all 44 existing question-solution/study-feature assertions passed (71 total) in database run 41193654822.
- Status: Fixed and verified.


## ERR-020 — Teacher-revocation regression test used malformed SQL delimiters

- Date: 2026-10-31
- Area: M4 teacher review permissions / pgTAP
- Symptom: The new test intended to verify that a revoked teacher loses access to a question and solution failed to parse; pgTAP stopped after 14 of the planned 20 assertions.
- Root cause: , which PostgreSQL rejected.
- Fix: Normalized all test arguments to paired `$` delimiters; confirmed the file contains exactly 20 assertions for its `plan(20)`. The test retains assertions for owner revocation, preservation of the owner's historical review, loss of former-teacher read access, and denial of subsequent review writes.
- Verification: Correction committed as `f14e61efbb4c0beed7c123bc4c0074fc25d378b1`; a fresh database CI run is pending. It is not yet marked passed.
- Status: Code corrected; fresh CI verification pending.
