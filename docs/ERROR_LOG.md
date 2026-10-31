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
- Resumable uploads above the current 4 MB request limit.
- Durable background worker with automatic retry scheduling and operational monitoring.
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
- Fix: Added an authenticated scheduled server route that uses a server-only Supabase service-role client, atomically claims one queued/failed/stale job at a time, refreshes the owning user's encrypted Google Drive token, processes OCR, records success/failure, retries within each row's max_attempts, and reclaims running jobs older than 15 minutes. Added a five-minute Vercel cron declaration and deployment/setup documentation.
- Verification: Added unit tests for retry-budget and claim eligibility policy. Full CI and real deployment/integration verification are pending. The worker requires CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and the same DRIVE_TOKEN_ENCRYPTION_KEY used for stored tokens.
- Status: Implemented in code; not operationally verified. The deployment scheduler must support the configured five-minute cadence, and the non-production secrets plus live Google Drive acceptance must be configured before this can be marked complete.
