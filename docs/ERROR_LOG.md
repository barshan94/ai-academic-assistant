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
- Verification: Unit tests cover stale, fresh, missing, invalid, future and custom-threshold timestamps; latest Vitest run on `c096fa921e1573566562bcf80d7e314c78a50781` passed all 132 tests across 29 files.
- Status: Unit-tested in CI. This is user-triggered recovery, not a durable scheduled worker; scheduled worker deployment acceptance remains separate.

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
- Date: 2026-10-31; detailed read-only ledger comparison: 2026-11-01
- Area: Database migration operations
- Symptom: The connected Supabase ledger contains 53 entries while the feature branch contains 94 migration files. Only 51 version-and-name pairs match exactly. Two shared-reference migrations have matching descriptions but different timestamp versions, and 41 additional repository versions have no exact remote ledger entry.
- Root cause: Local migration files and the connected project's migration ledger diverged. Matching descriptive names do not prove that two timestamped migrations are equivalent, and missing ledger entries do not prove that their SQL effects are absent from the remote schema.
- Fix: Added `docs/MIGRATION_RECONCILIATION.md` with the exact observed comparison, mismatched pairs, local-only versions and a safe schema-first reconciliation procedure. Do not blindly apply migrations, rewrite historical files or repair the remote ledger without schema evidence.
- Verification: Read-only migration ledger comparison only. No hosted migration, ledger repair or schema mutation was performed. Actual remote schema equivalence remains unknown.
- Status: Open release blocker; requires a clean isolated database and schema-level reconciliation.

## ERR-008 — Chromium browser smoke test pending
- Date: 2026-10-31
- Area: Browser CI
- Symptom: Chromium job was still installing Chromium at the checkpoint.
- Root cause: No failure established; browser install/build/test had not completed.
- Fix: Await workflow result and inspect logs if it fails. Never classify an in-progress job as a pass.
- Verification: Chromium smoke suite passed 7 tests with 1 unrelated authenticated two-account test skipped in run `41302672560` on commit `c096fa921e1573566562bcf80d7e314c78a50781`.
- Status: Credential-free browser smoke verified; authenticated two-account acceptance remains blocked on dedicated non-production test credentials.

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
- Verification: Pure unit tests for zero references, question references, note references and both reference types passed in the latest 132-test Vitest run on `c096fa921e1573566562bcf80d7e314c78a50781`.
- Status: Unit-tested in CI. This protects linked academic data but does not yet provide a first-class document versioning/revision workflow.

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
- Root cause: Several SQL test arguments used incomplete single-dollar delimiters instead of paired PostgreSQL dollar-quote delimiters. An attempted bulk correction also damaged some existing delimiters, so the first correction did not fully resolve the parse failure.
- Fix: Normalized the affected SQL arguments to paired dollar delimiters, retained all 20 assertions, and checked the test file for incomplete delimiter lines.
- Verification: Database authorization workflow run 41199349752 passed. The local Supabase migration suite applied all migrations and all 76 pgTAP assertions across the three test files passed. Foundation workflow run 41199349786 also passed lint, type-check, unit tests, production build and Chromium browser smoke tests.
- Status: Fixed and verified in CI. Authenticated two-account browser acceptance remains skipped because dedicated non-production credentials are not configured.


## ERR-021 — Shared syllabus authorization test fixtures exceeded least-privilege insert grants

- Date: 2026-10-31
- Area: M5 shared syllabus reference library / pgTAP
- Symptom: The new curator authorization suite failed 13 of 18 assertions. Chapter and topic fixture inserts were denied, dependent evidence and verification assertions then failed, and the non-admin catalogue-insert assertion expected the wrong SQLSTATE.
- Root cause: Test fixtures explicitly supplied generated primary-key IDs even though the application intentionally receives those IDs from database defaults and the authenticated role has column-scoped insert privileges. A separate non-admin insert is rejected by the catalogue guard trigger with P0001 before the RLS check, not with 42501.
- Fix: Changed the fixtures to omit generated chapter/topic/catalogue IDs and resolve their generated IDs by their unique fixture keys. Updated the expected SQLSTATE and message to match the guard trigger's actual behavior.
- Verification: Pending a fresh local Supabase migration and pgTAP run on the corrected test.
- Status: Test fixture corrected; CI verification pending.


## ERR-021 — Shared syllabus authorization fixture used a forbidden explicit ID
- Date: 2026-10-31
- Area: M5 shared reference syllabus / pgTAP
- Symptom: Curator catalogue creation failed with permission denied; dependent chapter/topic/evidence/publication assertions then failed. Subsequent fixture edits briefly introduced an unbalanced dollar-quote delimiter.
- Root cause: The least-privilege INSERT grant intentionally excludes the generated catalogue primary key, but the test supplied that ID explicitly. The fixture also needed to resolve the generated ID by its unique catalogue identity. A later editing pass left one SQL dollar-quote terminator unbalanced.
- Fix: Use the database-generated catalogue ID throughout the fixture and resolve it by board, qualification, subject and version; repair the SQL delimiter. Production grants and RLS policies were not weakened.
- Verification: Database authorization workflow run 41203734904 passed all 95 pgTAP assertions across four test files on commit 017ef50b.
- Status: Fixed and verified in isolated local Supabase CI. Real curator provisioning and official syllabus source curation remain separate operational tasks.


## ERR-022 — Acceptance checklist contained literal newline escape sequences

- Date: 2026-10-31
- Area: Project documentation / acceptance tracking
- Symptom: Several checklist items were concatenated onto the previous Markdown line and visibly contained literal newline escape text.
- Root cause: A documentation update inserted escaped newline text instead of actual line breaks.
- Fix: Replaced the literal escape sequences with real Markdown line breaks. No application code, database schema or deployment configuration was changed.
- Verification: Re-fetched the committed acceptance checklist and confirmed each affected item is on its own line; CI remains the authority for application validation.
- Status: Documentation defect fixed and committed.


## ERR-023 — Chapter-note RPC accepted unreviewed or misclassified question sources

- Date: 2026-10-31
- Area: M6 chapter-note source integrity / database authorization
- Symptom: The chapter workspace filtered source questions to approved questions assigned to the selected chapter, but the database draft-creation RPC checked only account ownership. A direct authenticated RPC call could therefore attach an unreviewed or unrelated approved question to a chapter note. A source could also lose approved status after draft creation and still pass the previous approval trigger.
- Root cause: Source eligibility was enforced by the UI query and not repeated by the database function; the approval trigger checked only that at least one source row existed.
- Fix: Added a migration that requires every question source to remain owner-approved and explicitly classified to the note's catalogue/chapter at draft creation. The approval trigger now rechecks those conditions immediately before approval. Added pgTAP cases for valid sources, unreviewed sources, wrong-chapter sources and source status changing after draft creation.
- Verification: Pending the isolated local Supabase migration and pgTAP workflow on the feature branch.
- Status: Implemented in code; CI verification pending. Live hosted migration has not been applied.


## ERR-024 — Chapter-note pgTAP test used malformed dollar-quoted SQL

- Date: 2026-10-31
- Area: M6 chapter-note source integrity regression tests
- Symptom: The local Supabase migration completed, but the new pgTAP file failed to parse two SQL statements; the test plan expected four assertions while only two were executed.
- Root cause: The test insertion step accidentally reduced the $$...$$ dollar-quote delimiters to single-dollar delimiters around the approval update and wrong-chapter RPC statements.
- Fix: Restored the exact $$ delimiters for both statements. No production migration change was needed for this syntax failure.
- Verification: A fresh database-authorization workflow was triggered on commit bbf7349; result pending. The earlier run had 97 database assertions across the suite but did not complete the new chapter-note test file.
- Status: Test syntax corrected; CI re-run pending.


## ERR-025 — Chapter-note approval trigger replacement initially omitted page-source validation

- Date: 2026-10-31
- Area: M6 chapter-note approval integrity
- Symptom: While extending the approval trigger to revalidate question sources, the replacement body initially checked question references but omitted the existing document-page-to-approved-question validation.
- Root cause: The trigger function was replaced wholesale without carrying forward the earlier page-source branch.
- Fix: Restored a page-source validation branch. Every attached page must still exist for the same owner and be linked to an approved question classified to the same catalogue and chapter at approval time.
- Verification: The updated migration is included in the latest feature-branch CI run; database pgTAP verification remains pending.
- Status: Corrected in migration before any live deployment; hosted Supabase was not changed.


## ERR-026 — Page-source approval rejected mixed-chapter pages

- Date: 2026-10-31
- Area: M6 chapter-note source integrity
- Symptom: A document page containing multiple captured questions could be rejected for a note even when at least one approved question on that page belonged to the selected chapter.
- Root cause: The approval trigger joined every question on the page and rejected the page if any joined question was unapproved or classified to another chapter. A page can legitimately contain questions from more than one chapter.
- Fix: Approval now requires at least one owner-matching, approved question on the page classified to the note's exact catalogue and chapter. Added a regression fixture with both matching and other-chapter questions on one page.
- Verification: Isolated local Supabase migration and pgTAP workflow 41215912807 passed on commit 19335bc, including the mixed-chapter page regression. No hosted Supabase migration was applied.
- Status: Fixed and verified in CI; live hosted migration and authenticated browser acceptance remain pending.

## ERR-027 — Malformed chapter-note citation markers could pass structural validation

- Symptom: The citation validator recognized complete bracketed labels but could overlook truncated or malformed citation-like tokens such as `[S1` or `[ S1 ]`.
- Root cause: Validation extracted only fully closed `[S...]` tokens and trimmed their contents, which could normalize malformed spacing instead of rejecting it.
- Fix: Detect complete and malformed citation-like tokens across the generated note and require exact source-label syntax and membership in the supplied source set. Added a regression test covering both spaced and truncated labels.
- Verification: Feature-branch CI is running for commits `7f1280f` and `5fd17ba`; do not consider this fixed-and-verified until the unit tests and build pass.
- Scope: This is structural validation only. It does not prove that cited source material actually supports the adjacent claim.

## ERR-028 — Chapter-note pgTAP fixture lost SQL dollar-quote delimiters

- Symptom: The expanded chapter-note database test stopped parsing at a statement beginning with `$update`; the test runner reported only 8 of 15 planned assertions.
- Root cause: The test fixture was inserted using JavaScript string replacement. Replacement-string semantics converted each SQL `$$` delimiter to a single `$`.
- Fix: Restored paired dollar delimiters around all newly added SQL statements. Future scripted edits must use a replacement callback when replacement text contains `$$`.
- Verification: Fixed in commit `46b3f24`. Isolated Supabase CI run `41217592205` on branch head `a08f414` passed all 15 chapter-note assertions and all 110 database authorization assertions across five test files. Marked fixed and CI-verified.


## ERR-029 — Lowercase malformed chapter-note citations escaped token detection
- Symptom: A lowercase malformed citation such as `[s1]` could be ignored when the same note also contained a valid uppercase citation.
- Root cause: Citation-like token discovery was case-sensitive, although the accepted citation format is intentionally uppercase.
- Fix: Make token discovery case-insensitive while retaining the strict uppercase exact-format validator; add a regression test where `[s1]` coexists with valid `[S1]`.
- Verification: Foundation CI run `41218501637` passed ESLint, application and Playwright type-checks, unit tests, and production build. Chromium smoke tests also passed (7 passed, 1 authenticated test skipped). The lowercase-citation regression is included in the passing unit suite on commit `937b52a`.


## ERR-030 — Study feature authorization tests did not cover aggregate RPC leakage
- Symptom: Existing M7 database tests checked direct table isolation and foreign-ID rejection but did not assert that aggregate analytics, paginated study queues, and weekly calendar RPCs return no cross-account totals or rows.
- Root cause: The acceptance suite tested underlying RLS tables more thoroughly than the SECURITY DEFINER aggregate/query boundaries.
- Fix: Extend the isolated study-feature pgTAP suite with eight outsider assertions across practice analytics, the consolidated study queue, and weekly calendar RPC results.
- Verification: Database authorization CI run `41218501676` passed all five pgTAP files: 118 assertions total, including 37 study-feature assertions and the eight new outsider aggregate-RPC checks, on commit `937b52a`.


## ERR-031 — AI provider actions had no account-scoped generation quota
- Symptom: Authenticated users could repeatedly invoke expensive AI answer and chapter-note generation actions without an application-level per-account quota.
- Root cause: Provider input bounds and server-side API-key handling existed, but no atomic cross-instance quota protected provider spend.
- Fix: Add a database-backed, atomic 15-minute quota per authenticated account and AI action. Answer generation is limited to five calls per window; chapter-note generation is limited to three. Actions fail closed if the quota RPC is unavailable. The client cannot choose or raise the limits.
- Verification: Isolated Supabase CI run `41219394217` passed all 133 pgTAP assertions across six files, including all 15 quota assertions. Foundation CI run `41219394202` passed ESLint, application/Playwright type-checks, unit tests and production build; Chromium smoke tests passed 7 tests with the authenticated test skipped. The quota integration is present in branch commit `e43816b`.


## ERR-032 — AI quota pgTAP exception assertions lost dollar-quote delimiters
- Symptom: The new quota database test executed its first 13 assertions but pgTAP reported a bad plan because the final two exception assertions were not parsed as intended.
- Root cause: JavaScript replacement-string semantics converted the `$$` delimiters in the inserted SQL block to single-dollar delimiters.
- Fix: Rebuild both exception assertion delimiters with replacement callbacks; avoid replacement strings containing SQL `$$` delimiters.
- Verification: Corrected in commit `e43816b`. Isolated Supabase CI run `41219394217` passed all 15 quota assertions and 133 total database assertions across six test files.


## ERR-033 — Google Drive revocation could reject on network failure without a retryable result

- Date: 2026-10-31
- Area: M2 Google Drive OAuth revocation
- Symptom: A fetch/network exception from Google's token-revocation endpoint propagated to the caller, while transient HTTP failures returned false.
- Root cause: The revocation helper handled HTTP statuses but did not normalize transport failures into its boolean retry contract.
- Fix: Catch transport failures and return false. Preserve idempotent success for HTTP 200 and Google's HTTP 400 invalid/already-revoked-token response; transient server errors remain false. The disconnect action now retains the encrypted connection when revocation fails so the user can retry, and the UI explicitly states that Drive is still connected. Add tests for request method, endpoint, no-store behavior, encoded token body, HTTP outcomes and network rejection.
- Verification: Foundation CI run `41221378201` passed lint, application/Playwright type-checks, all 116 unit tests across 22 files, and production build. The revocation-specific tests are included in that suite. Live Google OAuth revocation remains untested.
- Status: Code and automated unit coverage verified; live Google OAuth revocation remains outstanding.


## ERR-034 — Document worker ignored failed database state-transition writes

- Date: 2026-10-31
- Area: M2 background worker / job durability
- Symptom: The worker awaited document and job status updates but ignored Supabase errors. It could return a successful response even if the document never entered processing state or the job remained running after page extraction completed.
- Root cause: Database update calls were treated as best-effort even though their state transitions are part of the durable queue contract.
- Fix: Require the owner-scoped document processing transition to return the expected row. Require the running job's completion transition to return the expected row before reporting success. If finalization fails, the existing catch path marks the job failed for a later bounded retry; page replacement remains atomic.
- Verification: Foundation CI run `41221378201` passed lint, type-checks, 116 unit tests and production build. Database authorization run `41221378160` passed 133 pgTAP assertions. Live concurrent-claim, retry-exhaustion and stale-recovery acceptance remains outstanding.
- Status: Code and automated checks verified; live worker acceptance remains outstanding.


## ERR-035 — User-triggered document processing ignored persistence failures

- Date: 2026-10-31
- Area: M2 manual processing and recovery
- Symptom: The authenticated processing route ignored errors when marking a document as processing, recovering a stale document, and marking a processing job complete. It could report completion while the durable job state remained running, or continue after stale recovery failed to persist.
- Root cause: State-changing Supabase writes were awaited but their returned errors/rows were not checked.
- Fix: Require stale-document recovery to persist, require the owner-scoped processing transition to return the updated document, and require the running job completion transition to return the updated job. If completion persistence fails, route through the existing failure/retry path. Added a user-facing recovery failure notice.
- Verification: Foundation CI run `41221378201` passed lint, type-checks, 116 unit tests and production build; Chromium smoke tests passed 7 tests. This confirms the route compiles and the suite passes, but does not exercise the authenticated manual-processing state transitions. Live Drive and authenticated route acceptance remains outstanding.
- Status: Code and CI checks verified; authenticated route acceptance remains outstanding.


## ERR-036 — Worker failure handlers ignored errors while persisting failed state

- Date: 2026-10-31
- Area: M2 manual and scheduled document processing
- Symptom: When extraction or finalization failed, both worker paths attempted to mark the document and job failed but ignored database errors. The request could return a normal processing-failed response while the durable job remained running or the document retained a stale status.
- Root cause: Error-path database writes were not treated as part of the queue state machine.
- Fix: Both paths now check document failure updates and require the owner-scoped running job transition to return the updated row. If failure state cannot be persisted, the manual route displays a distinct warning; the scheduled worker returns HTTP 500 and leaves the lease for stale recovery rather than claiming the failure was saved.
- Verification: Foundation CI run `41222194720` passed lint, application/Playwright type-checks, 118 unit tests across 23 files and production build; Chromium smoke run passed 7 tests. Database authorization CI run `41222194715` passed all six pgTAP files. The latest CI validates compilation and regression suites, but does not inject authenticated database write failures into either route. Live stale-lease recovery remains outstanding.
- Status: Code and automated CI verified; failure-injection and live worker acceptance remain outstanding.


## ERR-037 — AI provider HTTP errors exposed response-body text

- Date: 2026-10-31
- Area: M3 AI provider error handling / privacy
- Symptom: Non-success provider responses included the first 300 characters of the provider response body in the thrown application error. Provider bodies are untrusted and may echo prompt content or other request details.
- Root cause: The adapter treated upstream error text as safe diagnostic information.
- Fix: HTTP failures now expose only the numeric HTTP status in the application error. Empty provider responses use a stable generic error code; upstream error messages and bodies are not copied into application errors.
- Verification: Foundation CI run `41226216229` passed the provider regression test as part of 121 unit tests across 23 files, plus lint, type checks and production build.
- Status: Code and automated regression coverage verified; live provider error behavior remains untested.


## ERR-038 — Edexcel dataset tests were accidentally nested inside the Cambridge Chemistry test

- Date: 2026-10-31
- Area: M5 syllabus import dataset regression tests
- Symptom: Vitest reported that a test function was called inside another test function; one syllabus dataset test failed to collect.
- Root cause: The Pearson Edexcel test cases were inserted before the Cambridge Chemistry test callback was closed, leaving an extra closing block at the end of the file.
- Fix: Close the Cambridge Chemistry test before declaring the two Edexcel cases, and remove the now-redundant trailing closure.
- Verification: Initial failure occurred in Foundation run `41225811672`. Corrected branch commit `6c795325` passed 121 unit tests across 23 files, lint, type checks and production build in run `41226216229`; Chromium smoke tests also passed 7 tests.
- Status: Fixed and CI-verified.

## ERR-039 — Shared syllabus seed-count assertion still expected only two catalogues after Edexcel drafts were added

- Date: 2026-10-31
- Area: M5 shared syllabus reference database tests
- Symptom: The reference-syllabus pgTAP suite expected two draft catalogues but the migration correctly seeded four Cambridge and Pearson Edexcel drafts.
- Root cause: The database test expectation was not updated when the two Pearson Edexcel catalogues were added.
- Fix: Update the expected draft-catalogue count from two to four and keep the 170-topic / 200-evidence assertions aligned with the four source-indexed drafts.
- Verification: Initial failure occurred in database run `41226067515`; corrected branch commit `6c795325` passed all 149 pgTAP assertions across six files in run `41226216227`.
- Status: Fixed and CI-verified.


## ERR-040 — Teacher verification migration had an unterminated dollar-quoted function body

- Date: 2026-11-01
- Area: M4 teacher verification / database migration
- Symptom: Clean local Supabase migration application failed at the SQL wrapper's `select` statement.
- Root cause: The private PL/pgSQL function body ended with a single dollar sign instead of the matching `$$` delimiter, so PostgreSQL continued parsing the following SQL wrapper as part of the function body.
- Fix: Restore the matching `$$` function-body terminator. No application behavior or authorization policy was weakened.
- Verification: Clean local Supabase migration application completed successfully in CI run `41228589810`. The subsequent pgTAP suite stopped at the legacy fixture INSERT documented in ERR-041.
- Status: SQL syntax fix and clean migration application confirmed; the affected authorization assertions remain unexecuted until the test-fixture phase.


## ERR-041 — Mark-scheme source-locator rollout left legacy test fixtures incomplete

- Date: 2026-11-01
- Area: M3 mark-scheme provenance / CI fixtures
- Symptom: Foundation type-check failed because mark-scheme unit fixtures did not provide the newly required `sourceLocator`. The database authorization suite also stopped when its legacy mark-scheme INSERT omitted the locator.
- Root cause: The implementation now requires an exact page/section locator in the server schema and rejects missing locators at the database INSERT boundary, but the existing test fixtures were not yet migrated.
- Fix: Pending the dedicated final testing/fixing phase: update unit and pgTAP fixtures with realistic source locators, and add explicit rejection coverage for missing/blank locators.
- Verification: Automatic feature-branch CI run `41228589729` reached type-check and failed on stale unit fixtures; database run `41228589810` applied every migration successfully, then failed in `question_solution_access.test.sql` on its legacy INSERT before the remaining assertions could run.
- Status: Implementation and migration apply; test-fixture updates remain pending. No hosted Supabase project was changed.


## ERR-042 — Document upload screen advertised an incorrect 100 MB limit

- Date: 2026-11-01
- Area: M2 document upload UI
- Symptom: The upload section displayed a 100 MB maximum while both the client and server enforce a 50 MB normalized-PDF limit.
- Root cause: The visible section-count label was not updated when resumable upload limits were reduced to 50 MB.
- Fix: Updated the visible limit to 50 MB. Corrected the Google Drive setup guide, which also incorrectly described the older 4 MB upload flow and claimed resumable uploads were not implemented.
- Verification: Implementation-only source review; no tests were run for this change.
- Status: Code and documentation corrected; test phase pending.

## ERR-043 — Google Drive provider errors could leak upstream details into application diagnostics

- Date: 2026-11-01
- Area: M2 Drive OAuth, upload and OCR; background worker; privacy
- Symptom: Google OAuth/Drive response messages could be copied into application exceptions, processing-job error fields or upload/worker HTTP responses. Upstream text is untrusted and could contain sensitive request or document context.
- Root cause: Provider response bodies and exception messages were treated as safe diagnostics.
- Fix: Replaced upstream error text with stable generic errors, bounded Google network requests with timeouts, and stopped persisting/returning raw worker, OCR and resumable-upload exceptions. Job metadata now stores a generic owner-safe failure message.
- Verification: Implementation-only source review; no tests were run for this change.
- Status: Code updated; redaction regression tests and operational observability review remain in the later testing phase.


## ERR-044 — Stored Google Drive connections were not revalidated against the requested OAuth scope

- Date: 2026-11-01
- Area: M2 Google Drive least-privilege authorization
- Symptom: The OAuth flow requested the narrow `drive.file` scope, but the callback trusted the returned scope string and existing stored connections were not checked before token refresh.
- Root cause: The requested permission was treated as proof of the permission actually granted.
- Fix: The callback now rejects a broader-than-requested returned scope. Token refresh checks the stored grant is exactly `https://www.googleapis.com/auth/drive.file`; connections with a broader or unknown scope must be reconnected. The UI explains the scope mismatch.
- Verification: Implementation-only source review; OAuth consent and revocation behavior remain for the later non-production acceptance phase.
- Status: Code and setup documentation updated; tests and real Google OAuth acceptance pending.


## ERR-045 — Literal escaped newline sequences remained in the global stylesheet

- Date: 2026-11-01
- Area: M7 study planner / responsive and print CSS
- Symptom: Two stylesheet locations contained the literal characters `\\n` instead of actual line breaks, potentially causing the following CSS selectors to be parsed incorrectly.
- Root cause: A previous source edit inserted escaped newline text into the CSS file.
- Fix: Replaced both literal escape sequences with real line breaks without changing the declarations or selectors.
- Verification: Static source inspection only; no browser or build tests were run in this implementation phase.
- Status: Source corrected; visual/browser acceptance remains pending.


## ERR-046 — Database mark-scheme validator needed null-safe JSON structure checks

- Date: 2026-11-01
- Area: M3 mark-scheme integrity / direct Data API writes
- Symptom: Static review of the new database-side mark-point validator found that missing JSON keys could yield SQL NULL in compound conditions, and array-length functions must not be called before the JSON type is confirmed.
- Root cause: The first trigger implementation combined JSON type and length checks in boolean expressions whose evaluation order is not guaranteed.
- Fix: Added a follow-up migration that uses explicit `IS DISTINCT FROM` type checks and separate validation steps before calling JSON array functions. It also rejects whitespace-padded point IDs and requires explicit key-phrase arrays.
- Verification: Implementation-only SQL review; database migration and malformed direct-insert behavior remain for the later test phase.
- Status: Corrected in migration `20261101041000_harden_mark_scheme_validator.sql`; tests pending.


## ERR-047 — HTTPS source validation allowed embedded URL credentials

- Date: 2026-11-01
- Area: M3 mark-scheme provenance and optional web research
- Symptom: HTTPS URL validation checked the scheme and host presence but did not reject user-info credentials embedded before the host.
- Root cause: URL validation treated the HTTPS scheme as sufficient and the database constraints only rejected whitespace and missing hosts.
- Fix: The mark-scheme schema now rejects username/password components. A database migration strengthens both mark-scheme and web-research URL constraints so direct inserts cannot store URLs with embedded credentials in the authority.
- Verification: Implementation-only validation review; database migration and malformed URL cases remain for the later test phase.
- Status: Code and migration committed; tests pending.


## ERR-048 — Quota denials and quota-service outages were missing from operational event logs

- Date: 2026-11-01
- Area: M8 operational observability / upload, AI and web-research quotas
- Symptom: Protected actions failed closed when an atomic quota RPC was unavailable, and expected quota denials were returned to users, but neither outcome had a distinct operational event. Operators could not distinguish a quota backend outage from normal user throttling using the structured event stream.
- Root cause: The safe logger covered provider and worker failures but did not include quota outcomes.
- Fix: Added allow-listed event categories for upload, AI-generation and web-research quota exhaustion and quota-RPC unavailability. The affected server routes/actions emit stable event and error codes only; no account IDs, quota counters, request bodies or submitted content are logged. Expected quota-exhaustion events use warning severity; quota-service outages remain error severity. Added recommended hosting-platform alert thresholds to `docs/OPERATIONS_AND_COSTS.md`.
- Verification: Source and documentation review only. No tests, live quota calls, dashboards or alerts were run/configured in this implementation phase.
- Status: Event instrumentation committed; alert configuration and test-phase regression coverage remain pending.


## ERR-049 — Google Drive OAuth failures lacked redacted operational visibility

- Date: 2026-11-01
- Area: M8 operational observability / Google Drive connection
- Symptom: OAuth configuration, token exchange, permission-scope rejection and connection persistence failures returned safe user-facing status codes but were not distinguishable in the platform's structured operational logs.
- Root cause: The callback normalized provider errors for privacy but did not emit an allow-listed operational event.
- Fix: Emit `google_drive_oauth_failed` with a stable error code and fixed route label for configuration, token-exchange, scope-mismatch, missing-refresh-token, persistence and unexpected callback failures. No OAuth code, provider response, token, user ID or exception detail is logged.
- Verification: Source and documentation review only. No OAuth flow, live Google credentials or log pipeline was exercised in this implementation phase.
- Status: Redacted event instrumentation committed; OAuth acceptance and monitoring configuration remain pending.


## ERR-050 — CI workflows used movable action tags and retained a privileged one-time workflow

- Date: 2026-11-01
- Area: M8 CI supply-chain security
- Symptom: Several workflows referenced third-party GitHub Actions by mutable major-version tags. A completed one-time migration-generation workflow retained `contents: write` permission and credential persistence.
- Root cause: Workflow setup prioritized convenience and did not remove the temporary write-enabled helper after its migration was generated.
- Fix: Pin checkout, setup-node, Supabase CLI setup and Gitleaks actions to immutable commit SHAs; pin the Supabase CLI binary to v2.122.0 instead of `latest`. Remove the one-time migration-generation workflow and its unnecessary repository write permission; disable persisted checkout credentials in all read-only workflows.
- Verification: Workflow source review only. No workflow was dispatched or re-run in this implementation phase.
- Status: CI configuration hardened; normal workflow execution and action compatibility remain for the separate testing phase.


## ERR-051 — Backup runbook required manual export steps without a repeatable encrypted helper

- Date: 2026-11-01
- Area: M8 backup operations / Supabase Free
- Symptom: The runbook described a manual logical dump but had no repository-owned helper to consistently create the three exports, record metadata/checksums and encrypt the resulting archive before off-device storage.
- Root cause: Backup procedure was documented but not packaged into a repeatable local workflow.
- Fix: Added `scripts/backup-supabase.sh`. It exports roles, schema and application data, validates non-empty outputs, records a non-secret manifest, creates SHA-256 checksums, encrypts the archive to an age public recipient, restricts output permissions, rejects backup destinations inside the repository, stages encrypted output before atomically publishing a collision-resistant archive name, and removes incomplete archives and temporary working files on exit. Updated the runbook with setup and invocation instructions, plus the local process-argument and SSD deletion limitations.
- Verification: Implementation-only source and documentation review. The helper was not executed; no database connection, age key, backup archive or restore was exercised.
- Status: Repeatable encrypted logical-export implementation added. Supabase Auth identity restoration, Storage objects, project settings and a verified end-to-end restore remain unresolved; this is not a full disaster-recovery solution.


## ERR-052 — Encrypted backup archives had no repository-owned integrity verification helper

- Date: 2026-11-01
- Area: M8 backup operations / archive integrity
- Symptom: The backup helper generated encrypted archives and checksums, but the runbook had no repeatable way to decrypt a candidate archive and validate its expected contents before off-site retention.
- Root cause: Backup creation was automated before archive verification was packaged.
- Fix: Added `scripts/verify-backup.sh`. It decrypts using a separately stored age identity, rejects unexpected archive entry names/order, checks required files and verifies SHA-256 checksums in a private temporary directory. The runbook now documents the integrity-verification command and clearly distinguishes it from a database restore.
- Verification: Implementation-only source review. The verifier was not run and no archive or private key was created.
- Status: Archive integrity verification implementation added; restore rehearsal and full disaster-recovery acceptance remain outstanding.


## ERR-053 — Scheduled document worker referenced the safe logger without importing it

- Date: 2026-11-01
- Area: M2 background worker / M8 operational observability
- Symptom: The worker's failure handler called `logSafeOperationalEvent`, but the module did not import that symbol. A production type-check would reject the route.
- Root cause: Operational logging was added to the worker failure path without updating its import block.
- Fix: Added the explicit import from `@/lib/observability/safe-log`.
- Verification: Source inspection only. No type-check, build, workflow or worker invocation was run in this implementation phase.
- Status: Source reference corrected; compile and failure-path regression coverage remain for the later testing phase.


## ERR-054 — Readiness endpoint parsed bearer authorization with an over-escaped whitespace pattern

- Date: 2026-11-01
- Area: M8 authenticated readiness endpoint
- Symptom: Static review found the bearer-header regular expression was escaped twice, so it would look for a literal backslash rather than whitespace after the word Bearer.
- Root cause: The source file was generated through a string template and the regular-expression escape was doubled.
- Fix: Corrected the expression to match one or more whitespace characters and re-read the committed source to confirm the intended regex.
- Verification: Source inspection only; no request or endpoint test was run.
- Status: Source corrected; authorization and readiness acceptance remain pending.


## ERR-055 — Readiness configuration check accepted Supabase URLs with embedded credentials or URL modifiers

- Date: 2026-11-01
- Area: M8 deployment readiness
- Symptom: Static review found that the configuration-only readiness check validated the Supabase URL protocol but did not reject URL user-info, query strings, fragments or non-root paths.
- Root cause: The first readiness implementation checked only HTTPS (or localhost HTTP during development).
- Fix: Require a secure protocol (or localhost HTTP outside production), no embedded username/password, no query/fragment, and a root path before reporting the Supabase URL as configured.
- Verification: Source inspection only; no endpoint request or live Supabase connection was made.
- Status: Configuration validation tightened; runtime and credential acceptance remain pending.


## ERR-056 — Readiness accepted non-canonical encryption-key encodings

- Date: 2026-11-01
- Area: M8 health/readiness configuration validation
- Symptom: Node's permissive Base64 decoder can ignore invalid characters or accept non-canonical encodings; checking only the decoded byte length could report a malformed Drive encryption key as configured.
- Root cause: The readiness check validated decoded length without validating the encoded representation.
- Fix: Require the exact 44-character Base64 form for 32 bytes, decode it, and require a canonical re-encoding match before reporting readiness.
- Verification: Source-level change only. Formal tests and runtime readiness checks are deferred to the user's separate testing phase.
- Status: Implemented; verification pending.


## ERR-057 — Readiness omitted the chapter-note AI capability

- Date: 2026-11-01
- Area: M8 health/readiness configuration validation
- Symptom: The readiness endpoint could report the AI integration as configured when an AI provider was available for answer generation but none was configured for chapter-note generation.
- Root cause: The readiness check validated only the answer task, despite the application exposing two separately routed AI tasks.
- Fix: Require valid provider configuration for both `answer` and `chapter-note` before returning ready.
- Verification: Source-level change only. Runtime checks and task-specific provider acceptance remain deferred to the testing phase.
- Status: Implemented; verification pending.


## ERR-058 — Readiness omitted the Google OAuth callback URI

- Date: 2026-11-01
- Area: M8 health/readiness configuration validation
- Symptom: The readiness endpoint could report Google Drive OAuth as configured when the client ID and secret existed but the callback URI was missing, malformed, insecure in production, or pointed at an unexpected path.
- Root cause: The check validated OAuth credentials but did not validate the redirect URI required by both authorization and token exchange.
- Fix: Require a valid HTTPS callback URI in production (localhost HTTP only outside production), with no user-info, query or fragment and the exact `/api/drive/callback` path.
- Verification: Source-level change only. Runtime configuration and Google OAuth acceptance remain deferred to the testing phase.
- Status: Implemented; verification pending.


## ERR-059 — Google OAuth callback treated a missing scope as the required scope

- Date: 2026-11-01
- Area: M2 Google Drive OAuth least-privilege validation
- Symptom: A token response with no `scope` field could pass the strict file-only scope check because the callback substituted the required scope when the provider omitted it.
- Root cause: The fallback converted absent provider evidence into a successful scope assertion.
- Fix: Treat a missing or non-string scope field as an empty grant and reject it; accept only the exact single `drive.file` scope.
- Verification: Source-level change only. OAuth behavior must be exercised in the later non-production testing phase.
- Status: Implemented; verification pending.

## ERR-060 — Backup verifier extracted archive-controlled link metadata

- Date: 2026-11-01
- Area: M8 backup archive verification / local filesystem safety
- Symptom: The verifier checked the expected tar member names before extraction, but normal tar extraction can also create archive-supplied symlinks or hardlinks. A crafted archive could therefore attempt filesystem writes outside the private verification directory.
- Root cause: Member-name allow-listing alone does not constrain archive entry types or link targets.
- Fix: Replace filesystem extraction with per-member streaming via `tar -xO` into newly created regular files inside the private temporary directory. The verifier no longer creates archive-controlled paths or link metadata.
- Verification: Source review only. No archive was decrypted or verified, and no security test was run during the implementation phase.
- Status: Extraction path hardened; formal regression testing remains pending.

## ERR-061 — Readiness monitoring was implemented without a scheduled caller

- Date: 2026-11-01
- Area: M8 operations / monitoring
- Symptom: The protected readiness endpoint existed, but no scheduled workflow called it. A deployment could become unready without a recurring GitHub Actions signal.
- Root cause: Health endpoint implementation and monitoring/alert delivery had been treated as one item, but only the endpoint existed.
- Fix: Added `.github/workflows/health-monitor.yml`, scheduled every 15 minutes and manually dispatchable. It validates an HTTPS origin and a sufficiently long bearer secret, calls the protected readiness endpoint with bounded network timeouts, checks for HTTP 200 and the generic ready status, and does not print response bodies or credentials.
- Verification: Workflow source committed on `feature/m3-ai-solver`; no workflow execution or live deployment is claimed.
- Status: Implemented in code. Activation requires placing the workflow on the default branch and configuring repository secrets `APP_BASE_URL` and `CRON_SECRET`. GitHub notification delivery depends on repository/user settings; dedicated dashboards, alert thresholds and external paging remain unimplemented.

## ERR-062 — Readiness checked database reachability but not core application schema

- Date: 2026-11-01
- Area: M8 health/readiness
- Symptom: The readiness endpoint could return ready when Supabase PostgREST was reachable and `profiles` existed, even if the document-processing tables required by the application were missing.
- Root cause: The original database probe verified transport and one foundational table, not the minimum schema needed by the document workflow.
- Fix: Probe `profiles`, `documents` and `processing_jobs` in parallel using bounded, server-only HEAD queries. No rows or database contents are returned.
- Verification: Source and documentation updated on the feature branch. Runtime checks and migration-absence scenarios remain deferred to the separate testing phase.
- Status: Implemented; verification pending. This checks three core tables only and does not prove every feature migration or integration is ready.


## ERR-063 — Disconnected Drive accounts consumed upload quota

- Date: 2026-11-01
- Area: M2 resumable upload admission / quota fairness
- Symptom: A valid upload attempt consumed the owner's hourly/daily new-document quota before the server checked whether Google Drive was connected and could provide an access token.
- Root cause: Quota consumption preceded the non-mutating Drive authorization prerequisite.
- Fix: Acquire the owner-scoped Drive access token before atomically consuming quota. Disconnected or reauthorization-required accounts now fail before using an upload slot; quota is still consumed before creating a remote resumable session.
- Verification: Source change committed on the feature branch. No tests or live OAuth/upload requests were run during implementation.
- Status: Implemented; regression and live integration verification deferred to the separate testing phase.


## ERR-064 — Upload-session creation parsed an unbounded JSON request body

- Date: 2026-11-01
- Area: M2 resumable upload API / request resource limits
- Symptom: The upload-session start route parsed JSON directly with `request.json()`, allowing an authenticated caller to submit an unnecessarily large metadata body before the route validated the small set of expected fields.
- Root cause: The route bounded PDF bytes and chunk bodies, but did not impose a corresponding bound on the session-creation metadata request.
- Fix: Read the request stream with a strict 16 KiB ceiling, reject oversized declared or streamed bodies, require a JSON object, reject malformed JSON, and return 413 for oversized payloads or 400 for invalid payloads. Numeric Content-Length validation is explicit.
- Verification: Source inspection only. No test command or HTTP request was run during the implementation phase.
- Status: Implemented; request-boundary regression coverage remains for the separate testing phase.


## ERR-065 — Account switching retained an unusable resumable upload token

- Date: 2026-11-01
- Area: M2 resumable upload / browser session lifecycle
- Symptom: If a user switched accounts in the same browser and re-selected a file with an unfinished upload, the browser reused the locally stored encrypted session token. The server correctly rejected it because the token was bound to the previous owner, but the browser retained the unusable token and repeated the failure.
- Root cause: The browser cleanup logic cleared local session state on expiry but did not clear it on the server's explicit cross-account rejection. Its follow-up message also incorrectly implied the session remained resumable.
- Fix: Clear the matching localStorage session after an explicit owner mismatch and tell the user to re-select the file to create a new owner-bound session. The server-side owner check remains unchanged.
- Verification: Source inspection only; no tests or account-switch HTTP/browser scenarios were run.
- Status: Implemented; cross-account regression verification deferred to the separate testing phase.


## ERR-066 — Browser storage failures could interrupt resumable upload handling

- Date: 2026-11-01
- Area: M2 resumable upload / browser persistence
- Symptom: The upload form accessed localStorage directly. Browsers or privacy settings that deny storage access could throw while reading, writing or clearing the resumable session, interrupting an otherwise valid upload or masking the original error.
- Root cause: Browser persistence was treated as guaranteed rather than optional; persisted JSON was also trusted without checking that its file metadata matched the currently selected normalized file.
- Fix: Centralized best-effort storage helpers, validate the stored session token and exact filename/size before reuse, discard malformed/mismatched entries, and allow the current upload to proceed if storage is unavailable. The UI already explains that resume persistence is conditional.
- Verification: Source inspection only. No browser test or test command was run in the implementation phase.
- Status: Implemented; storage-denied, malformed-entry and reload-resume scenarios remain for the separate testing phase.


## ERR-067 — OCR worker buffered unbounded Google Drive responses

- Date: 2026-11-01
- Area: M2 document extraction / worker resource limits
- Symptom: The background worker downloaded the archived PDF and OCR text with unbounded `arrayBuffer()` / `text()` calls. A malformed or unexpectedly large upstream response could allocate memory beyond the application's documented 50 MB upload limit, risking worker memory exhaustion.
- Root cause: The upload path enforced a 50 MB limit, but the subsequent Drive download and OCR export path did not independently enforce response-size bounds.
- Fix: Added streamed response readers with hard byte caps: 50 MB for the archived PDF, 10 MB for extracted OCR text, and 64 KiB for OCR conversion metadata. Content-Length is checked when supplied, while streamed byte counting remains authoritative when it is absent or inaccurate. OCR text decoding is strict UTF-8; temporary Drive OCR files remain deleted in the existing finally block.
- Verification: Source inspection only; no tests, typecheck, build or worker invocation was run in the implementation phase.
- Status: Implemented; bounded-stream edge cases and real Drive OCR acceptance remain for the separate testing phase.


## ERR-068 — Google OAuth and upload metadata responses were parsed without byte limits

- Date: 2026-11-01
- Area: M2 Google Drive integration / upstream response resource limits
- Symptom: OAuth refresh, legacy Drive upload and resumable chunk completion paths parsed upstream JSON or text directly. An unexpectedly large response could be buffered before parsing.
- Root cause: The archived-PDF/OCR response hardening did not cover the smaller metadata and token-exchange responses used by the other Drive paths.
- Fix: Added a shared bounded Google JSON response reader with strict UTF-8/object validation and a 64 KiB ceiling. Applied it to user OAuth refresh, background-worker OAuth refresh and legacy Drive upload metadata. Resumable chunk responses now use the same 64 KiB streamed cap; expected 308/404 responses remain body-free.
- Verification: Source inspection only. No tests, typecheck, build, HTTP requests or live Google calls were run during implementation.
- Status: Implemented on the feature branch; malformed/oversized upstream response tests and live integration verification are deferred to the separate testing phase.


## ERR-069 — Decrypted resumable upload claims were trusted without structural validation

- Date: 2026-11-01
- Area: M2 resumable upload / session integrity
- Symptom: The chunk route decrypted and parsed the upload-session token but trusted its JSON shape until individual fields happened to be used. A malformed or obsolete encrypted payload could reach the upload transport with invalid file metadata or an invalid session URI.
- Root cause: Authenticated encryption established token integrity, but the route did not separately validate the decoded claim schema, expiry, file constraints and Google upload endpoint before use.
- Fix: Validate the decrypted payload as a non-array object with a non-empty owner, canonical safe PDF filename, bounded positive file size, SHA-256 checksum, valid page-count range, unexpired safe-integer expiry and HTTPS Google Drive upload-session URI restricted to the expected upload endpoint path. The transport retains its independent URL validation.
- Verification: Source inspection only; malformed-token, expiry and URL-boundary tests remain for the separate testing phase.
- Status: Implemented on the feature branch; no test command, typecheck, build or live Drive request was run during implementation.


## ERR-070 — Google OAuth callback buffered an unbounded token response

- Date: 2026-11-01
- Area: M2 Google Drive OAuth / upstream response resource limits
- Symptom: The authorization-code callback parsed the Google token response directly with `response.json()`, unlike the now-bounded refresh-token paths.
- Root cause: OAuth callback exchange was not included in the earlier Drive metadata response-size audit.
- Fix: Reuse the shared 64 KiB bounded, strict-UTF-8 JSON reader for the callback exchange and reject refresh tokens outside the expected non-empty 4 KiB maximum before encryption.
- Verification: Source inspection only; malformed/oversized token response tests and live OAuth callback acceptance remain pending for the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck, build or live OAuth request was run during implementation.


## ERR-071 — Google Drive upload-session URL checks accepted ambiguous path prefixes

- Date: 2026-11-01
- Area: M2 resumable upload / outbound request destination validation
- Symptom: The Drive upload-session URL guard used a broad `startsWith` path check and did not explicitly reject URL user-info components.
- Root cause: The original guard checked HTTPS and the expected hostname but did not enforce a path-segment boundary or reject embedded credentials.
- Fix: Centralize URL validation for both newly issued and decrypted resumable session URLs. Require HTTPS, the exact Google API hostname, no username/password, and a pathname matching the expected files endpoint with a segment boundary. Google-provided query parameters remain allowed because Drive uses them for upload session IDs.
- Verification: Source inspection only; URL edge-case tests and live resumable-upload acceptance remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests or live provider requests were run during implementation.


## ERR-072 — Shared bounded AI/research response reader did not enforce strict decoding or release its stream lock

- Date: 2026-11-01
- Area: M6 AI/research integrations / shared HTTP response handling
- Symptom: The shared limited-response reader decoded malformed UTF-8 with replacement characters and did not explicitly release its reader lock after consuming the stream. It also treated malformed Content-Length values as if no declared length existed.
- Root cause: The helper enforced the streamed byte ceiling but did not fully validate transport metadata/encoding or close the reader lifecycle explicitly.
- Fix: Reject malformed declared lengths, preserve the streamed byte ceiling, release the reader lock in a `finally` block, return an empty string only for genuinely body-less responses, and decode UTF-8 in fatal mode. AI and web-research callers already convert these failures into generic provider errors.
- Verification: Source inspection only; invalid UTF-8, malformed Content-Length and stream cancellation tests remain for the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-073 — Document review actions reported success without confirming affected rows

- Date: 2026-11-01
- Area: M2 document review / owner-scoped server actions
- Symptom: Manual page correction treated a successful database response as proof that a row was updated, even when no owner-scoped page matched; it also ignored failure to update the parent document status. Document approval did not validate the document UUID or confirm that the parent document existed and that all selected pages were actually updated.
- Root cause: The server actions checked database error objects but did not request and verify the affected rows.
- Fix: Validate correction/approval identifiers as UUIDs, request the updated owner-scoped rows, reject missing page/document matches, and report success only after the expected page rows and parent document update are confirmed.
- Atomic closure: Document approval is performed by the transactional `approve_document_review` RPC introduced in `20261101070719_make_document_worker_and_review_transitions_atomic.sql`. Manual page correction and the parent document's review state are now updated by one transaction in `save_document_page_correction`, introduced in `20261101110000_make_manual_document_corrections_atomic.sql`. Both functions enforce the authenticated owner, lock the relevant rows and raise on incomplete updates so the transaction rolls back.
- Verification: Regression coverage exists in `supabase/tests/atomic_document_workflows.test.sql` for successful approval, cross-account rejection, page-count mismatch and injected page-update failure. The latest-branch test suite has not been run; runtime acceptance remains pending.
- Status: **Source implementation closed** by the two forward-only migrations. Test execution and hosted migration application remain deferred; no hosted database was changed.


## ERR-074 — Reference syllabus date validation accepted impossible calendar dates

- Date: 2026-11-01
- Area: M4 reference syllabus administration / input validation
- Symptom: The date validator checked the YYYY-MM-DD shape and relied on Date.parse, which can normalize impossible dates such as the 31st day of a 30-day month into a different valid date.
- Root cause: Parsing success was treated as proof that the original calendar date existed.
- Fix: Parse year, month and day components and compare them with the UTC date components after construction. Reject normalized or impossible dates while continuing to allow empty optional dates.
- Verification: Source inspection only; leap-year, month-boundary and invalid-day cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-075 — OCR conversion metadata bypassed strict JSON decoding

- Date: 2026-11-01
- Area: M2 Google Drive OCR / upstream response validation
- Symptom: OCR conversion metadata was byte-bounded but parsed through Buffer UTF-8 replacement decoding and JSON.parse directly, unlike the shared strict Google JSON response helper.
- Root cause: The OCR conversion path retained its earlier parser after the common bounded JSON helper was introduced.
- Fix: Route the OCR conversion response through the shared 64 KiB bounded JSON reader, which enforces fatal UTF-8 decoding and a top-level JSON object before the temporary Drive file ID is used.
- Verification: Source inspection only; malformed UTF-8, malformed JSON and oversized metadata cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck, build or live Drive request was run during implementation.


## ERR-076 — Owner syllabus catalogs accepted impossible effective dates

- Date: 2026-11-01
- Area: M4 owner syllabus catalog / input validation
- Symptom: Owner-managed syllabus catalogs limited effective-date strings to ten characters but did not verify their calendar validity, allowing impossible dates to be stored.
- Root cause: The catalog form schema validated field length but not the actual YYYY-MM-DD date.
- Fix: Apply the same strict UTC calendar-date validation used by reference syllabus administration while preserving empty optional dates.
- Verification: Source inspection only; leap-year, invalid-day and month-boundary regression tests remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-077 — Syllabus evidence links accepted deceptive credential-bearing HTTPS URLs

- Date: 2026-11-01
- Area: M4 syllabus evidence / untrusted source-link validation
- Symptom: HTTPS-only validation accepted URLs containing embedded username/password components, which can make a link's displayed trusted-looking prefix differ from its actual destination host.
- Root cause: Source-link schemas checked the URL protocol but did not reject URL user-info components.
- Fix: Owner-managed and reference syllabus source/evidence URL validators now require HTTPS and reject embedded URL credentials.
- Verification: Source inspection only; deceptive-host, user-info and valid HTTPS URL regression cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-078 — Owner syllabus catalog accepted reversed effective dates

- Date: 2026-11-01
- Area: M4 owner syllabus catalog / date-range validation
- Symptom: A catalog could be created with an effective end date earlier than its effective start date, despite both values being individually valid calendar dates.
- Root cause: The owner catalog schema validated date shape and calendar validity but did not enforce chronological ordering.
- Fix: Add a cross-field schema check that rejects an effectiveTo value earlier than effectiveFrom while continuing to allow either optional date to be empty.
- Verification: Source inspection only; reversed, equal, one-sided and valid date-range cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-079 — Question review action reported updates for missing or malformed IDs

- Date: 2026-11-01
- Area: M4 question review / owner-scoped server action
- Symptom: The review action accepted any non-empty question identifier and returned an updated result whenever the database request had no error, including when no owner-scoped question matched.
- Root cause: The action did not validate the identifier format or request confirmation of the affected row.
- Fix: Validate the question identifier as a UUID and require the owner-scoped update to return the updated row before reporting success.
- Verification: Source inspection only; malformed UUID, cross-owner, missing-row and valid status-transition cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-080 — Reference syllabus evidence could be attached across unrelated chapters

- Date: 2026-11-01
- Area: M5 reference syllabus evidence / relational integrity
- Symptom: A platform administrator could submit a valid catalog ID, chapter ID and optional topic ID that individually existed but did not belong to the same catalog/chapter hierarchy.
- Root cause: The evidence action validated identifier formats but inserted the supplied relationships without checking that the chapter belonged to the selected catalog and the topic belonged to that chapter.
- Fix: Before insertion, load the chapter using both chapter and catalog IDs; when a topic is supplied, confirm it belongs to that exact chapter. Reject mismatched or missing relationships.
- Verification: Source inspection only; cross-catalog, cross-chapter, missing-row and valid evidence cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-081 — Reference syllabus catalog accepted reversed effective dates

- Date: 2026-11-01
- Area: M5 reference syllabus catalog / date-range validation
- Symptom: A reference catalog could be created with an effective end date earlier than its effective start date even though both dates were individually valid.
- Root cause: The reference catalog schema validated calendar dates independently but omitted the cross-field chronological rule.
- Fix: Reject a non-empty effectiveTo value earlier than effectiveFrom, while preserving optional empty date boundaries.
- Verification: Source inspection only; reversed, equal, one-sided and valid date-range cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-082 — Syllabus JSON import accepted credential-bearing HTTPS source URLs

- Date: 2026-11-01
- Area: M5 syllabus import / source URL validation
- Symptom: The JSON import path accepted HTTPS URLs containing embedded username/password components, despite the owner and reference catalog forms rejecting them.
- Root cause: The import schema checked only the HTTPS protocol and did not reject URL user-info.
- Fix: Require imported source URLs to use HTTPS and contain no embedded username or password.
- Verification: Source inspection only; deceptive-host, user-info and valid HTTPS import cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-083 — Owner syllabus catalog state transitions allowed edits after verification

- Date: 2026-11-01
- Area: M5 owner syllabus catalog lifecycle
- Symptom: The owner verification action could re-verify a catalog regardless of its current status, and reference evidence could still be added after a catalog had been verified or retired.
- Root cause: The verification update did not require the draft state, and the evidence action checked ownership and hierarchy but not the catalog lifecycle state.
- Fix: Restrict verification to draft catalogs and restrict evidence insertion to draft catalogs. Existing retired/verified catalogs are not silently moved back into the verified state.
- Verification: Source inspection only; draft, verified, retired and concurrent transition cases remain deferred to the testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-084 — Platform reference syllabus catalogs remained editable after verification

- Date: 2026-11-01
- Area: M5 platform reference catalog lifecycle
- Symptom: Platform administrators could add chapters, topics or evidence to a catalog after it had been verified or retired.
- Root cause: The reference chapter, topic and evidence actions validated identifiers and relationships but did not consistently enforce the draft-only editing lifecycle.
- Fix: Require the reference catalog to be in draft state before adding chapters, topics or evidence. Existing verify and retire actions already enforce their respective source states.
- Verification: Source inspection only; draft edits, verified/retired rejection and lifecycle race cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-085 — Reference syllabus catalog could be verified without source evidence

- Date: 2026-11-01
- Area: M5 platform reference catalog verification
- Symptom: A draft reference catalog could transition to verified even when its source URL was empty or invalid.
- Root cause: The verification action checked only the catalog ID and draft status; it did not require a valid source URL before changing lifecycle state.
- Fix: Load the draft catalog's source URL, require a parseable HTTPS URL with a hostname and no embedded credentials, and only then perform the draft-to-verified update.
- Verification: Source inspection only; missing, malformed, credential-bearing, non-HTTPS and valid HTTPS source cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-086 — Owner syllabus catalog verification trusted any non-null source URL

- Date: 2026-11-01
- Area: M5 owner syllabus catalog verification
- Symptom: An owner catalog with a legacy or externally modified malformed source URL could pass the verification precondition merely because source_url was non-null.
- Root cause: The verification action checked only source_url nullability and relied on creation-time validation.
- Fix: Load the owner-scoped draft catalog and re-validate that its source URL is HTTPS, has a hostname and contains no embedded credentials before updating its status.
- Verification: Source inspection only; legacy malformed URL and valid-source transition cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-087 — Teacher invite revocation reported success when no invite was changed

- Date: 2026-11-01
- Area: M5 teacher invitation lifecycle / owner server action
- Symptom: Revocation could redirect to a success state when the invite did not exist, belonged to another owner/question, or had already been revoked, because the action checked only the database error.
- Root cause: The update did not request or verify the affected row.
- Fix: Return the updated invite ID from the owner- and question-scoped update and report failure when no row was changed.
- Verification: Source inspection only; missing, foreign-owner, already-revoked and valid revocation cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.

## ERR-088 — Mark scheme action parsed unbounded JSON form input

- Date: 2026-11-01
- Area: M5 mark scheme authoring / server action input bounds
- Symptom: The action passed the entire submitted points field to JSON.parse before applying the structured mark-scheme limits, allowing unnecessarily large request bodies to consume memory and CPU.
- Root cause: Schema validation bounded the parsed object but no raw serialized-input limit existed before parsing.
- Fix: Reject points JSON strings larger than 256 KiB before JSON.parse; the existing schema continues to enforce per-field and per-array limits after parsing.
- Verification: Source inspection only; boundary-size, malformed JSON and valid maximum mark-scheme cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-089 — Stale document recovery could report success without updating the document

- Date: 2026-11-01
- Area: M5 document processing / stale-job recovery
- Symptom: After successfully marking a stale processing job as failed, the recovery route updated the parent document but checked only the database error. A zero-row owner-scoped update could therefore be treated as successful, leaving the job and document lifecycle states inconsistent.
- Root cause: The parent-document recovery update did not return or verify the affected row.
- Fix: Request the updated document ID and require exactly one returned row before continuing recovery.
- Verification: Source inspection only; concurrent deletion, owner-scope mismatch and successful stale-recovery cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-090 — Document processing failure handler did not verify the parent row

- Date: 2026-11-01
- Area: M5 document processing / failure-state persistence
- Symptom: The processing catch handler persisted the failed processing-job row and updated the parent document in parallel, but checked only the document update error. A zero-row owner-scoped document update could be mistaken for a fully persisted failure state.
- Root cause: The parent-document update did not select and verify the affected row, unlike the processing-job update.
- Fix: Return the updated document ID and require both the parent document and running job updates to return rows before reporting that failure state was persisted.
- Verification: Source inspection only; provider failures, concurrent state changes and zero-row update cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-091 — Background worker failure handler did not verify the parent document row

- Date: 2026-11-01
- Area: M5 background document worker / failure-state persistence
- Symptom: The cron worker's failure handler checked the processing-job update but checked only the database error for the owner-scoped parent-document update. If the document row was missing or no longer matched the owner filter, the worker could treat a partial failure-state write as complete.
- Root cause: The parent-document update did not return and verify the affected row.
- Fix: Select the updated document ID and require both the document and running-job failure updates to return rows before reporting the failure state as persisted.
- Verification: Source inspection only; worker failure, missing-document and concurrent state-change cases remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-092 — Practice answer action trusted a client-supplied set ID for navigation

- Date: 2026-11-01
- Area: Practice sets / answer recording
- Symptom: The action validated the submitted item ID and set ID formats, but invoked the answer-recording RPC using only the item ID and then used the unverified submitted set ID for redirects and cache revalidation. A mismatched set ID could therefore update an item while sending the learner to an unrelated practice set route.
- Root cause: The action did not verify the owner-scoped relationship between the selected practice item and the submitted practice set before recording the answer.
- Fix: Resolve the item through the owner-scoped item/set relationship before invoking the RPC, then use the database-returned set ID for all redirects and revalidation.
- Verification: Source inspection only; mismatched IDs, inaccessible items and successful answer recording remain deferred to the separate testing phase.
- Status: Implemented on the feature branch; no tests, typecheck or build were run during implementation.


## ERR-093 — Owner syllabus date validation used an over-escaped digit pattern
- Date: 2026-11-01
- Area: Syllabus catalog creation / date validation
- Symptom: Valid owner-entered effective dates in YYYY-MM-DD format were rejected before the database insert.
- Root cause: The JavaScript regular-expression literal contained doubled backslashes, so `\\d` matched a literal backslash-plus-d rather than a digit.
- Fix: Corrected the date-shape expression to use the digit character class escape `\d` while retaining the UTC round-trip check that rejects impossible calendar dates.
- Verification: Source inspected and corrected on `feature/m3-ai-solver`; tests remain deferred to the dedicated testing phase.
- Status: Implementation fixed; regression verification pending.


## ERR-094 — Verified owner syllabus taxonomy remained editable
- Date: 2026-11-01
- Area: Syllabus catalog lifecycle
- Symptom: Owner actions allowed chapter and topic insertion into a verified catalog; only retired catalogs were blocked.
- Root cause: The server actions checked for the retired state rather than requiring the catalog to remain in draft.
- Fix: Chapter and topic creation now require an owner-scoped catalog in draft status and return a catalog-locked result for verified or retired catalogs.
- Verification: Source-level change committed; database-level lifecycle enforcement and concurrency regression coverage remain pending.
- Status: Application action hardened; a database trigger/RPC is still required to close read-then-write races.


## ERR-095 — Readiness endpoint parsed the Bearer separator as a literal escape

- Date: 2026-11-01
- Area: Health readiness endpoint / cron-secret authorization
- Symptom: A correctly formatted `Authorization: Bearer <secret>` header was not stripped to the supplied secret, so the protected readiness endpoint rejected valid credentials.
- Root cause: The regular-expression literal used an over-escaped whitespace token (`\\s`), matching a literal backslash followed by `s` instead of whitespace.
- Fix: Corrected the expression to use the JavaScript regex whitespace escape (`\s`) before constant-time secret comparison.
- Verification: Source inspection only; valid, invalid, missing and unequal-length bearer credentials remain deferred to the dedicated testing phase.
- Status: Implemented on `feature/m3-ai-solver`; tests, typecheck and build were not run during implementation.


## ERR-096 — Google Drive OAuth requested incremental scopes but rejected expanded grants

- Date: 2026-11-01
- Area: Google Drive OAuth authorization
- Symptom: The authorization request enabled incremental scope grants while the callback and Drive token reader required the stored grant to equal the single `drive.file` scope exactly. A user with other previously granted Google scopes could receive a combined grant and be rejected despite approving the requested Drive permission.
- Root cause: The OAuth request's `include_granted_scopes=true` setting conflicted with the application's strict least-privilege scope invariant.
- Fix: Removed the incremental-scope parameter. The flow now requests only the explicitly configured `drive.file` scope, consistent with callback validation and token-use checks.
- Verification: Source inspection only; Google OAuth consent, scope response, reconnect and refresh-token preservation scenarios remain deferred to the dedicated testing/acceptance phase.
- Status: Implemented on `feature/m3-ai-solver`; no tests, typecheck or build were run during implementation.


## ERR-097 — Rejected web-research requests consumed the other quota allowance

- Date: 2026-11-01
- Area: Web-research quota enforcement / concurrent request accounting
- Symptom: A request rejected by the 15-minute rate limit still incremented the daily allowance. The previous implementation also performed the daily and window checks without serializing concurrent requests, allowing simultaneous requests to race past a limit.
- Root cause: The quota function incremented the daily counter before checking the short-window limit and did not acquire a per-owner transaction lock before reading or updating either counter.
- Fix: Added a forward-only Supabase migration that serializes quota decisions per owner with a transaction-scoped advisory lock, takes the quota timestamp after acquiring that lock, checks both limits before writing either counter, and increments both counters only when the request is admitted. The function remains authenticated-only and retains the existing 20-per-UTC-day and 5-per-15-minute limits.
- Verification: Implementation/source review only. The migration has not been applied to any database; SQL execution, concurrent-request behavior, quota boundary cases and Supabase advisors are deferred to the dedicated testing/fixing phases.
- Status: Migration committed to `feature/m3-ai-solver`; no tests, typecheck or build were run during implementation.


## ERR-098 — Document worker completion and manual approval could persist partial lifecycle state

- Date: 2026-11-01
- Area: Document processing / review lifecycle transactions
- Symptom: Both the manual processing route and background worker committed extracted page replacement and parent-document review state before separately marking the processing job completed. If the second write failed, the document and job could disagree. Manual approval similarly updated all page statuses and the parent document in separate requests, so a partial approval could leave mixed states.
- Root cause: Related document, page and processing-job lifecycle writes were split across independent PostgREST transactions.
- Fix: Added the complete_document_processing RPC, which invokes the existing transactional page replacement and marks the matching running job completed within the same database transaction. It permits either the trusted service role or the authenticated document owner, with owner matching enforced for the latter. Both the manual processing route and background worker now use this RPC. Added approve_document_review, which locks the owner-scoped document and pages, validates the review state and page-count invariant, then marks all pages complete and the document ready atomically. Updated both server actions/routes and registered the function signatures in types/database.ts.
- Verification: Source/migration review only. The migration has not been applied to a database; SQL execution, RLS behavior, service-role execution, concurrent processing/approval and rollback scenarios remain deferred to the dedicated testing and fixing phases.
- Status: Migration, application call sites, database types and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-099 — Resumable upload could leave an orphaned document or processing job

- Date: 2026-11-01
- Area: Resumable PDF upload / document intake transaction
- Symptom: Upload completion inserted the document row and processing-job row in separate requests. If job insertion failed and the compensating document delete also failed, the library could retain a document that had no queued processing job. Concurrent uploads of identical content could also race around the duplicate check.
- Root cause: Document registration and job creation were not one database transaction, and the application-level duplicate lookup was not serialized.
- Fix: Added the register_uploaded_document RPC to validate the authenticated owner and upload metadata, serialize same-owner/same-content registrations with a transaction-scoped advisory lock, preserve duplicate Drive-file identity, and insert the document and initial processing job in one transaction. Updated the upload completion route to use the RPC and avoid deleting a Drive file when an RPC response error leaves commit status ambiguous. Registered the function signature in types/database.ts.
- Verification: Source/migration review only. The migration has not been applied to a database; SQL execution, RLS permissions, duplicate/concurrent upload behavior, transaction rollback and ambiguous network response recovery remain deferred to the dedicated testing and fixing phases.
- Status: Migration, upload route, database types and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-100 — Syllabus taxonomy lifecycle depended on application-only draft checks

- Date: 2026-11-01
- Area: Owner and shared-reference syllabus catalog lifecycle
- Symptom: Application actions checked that catalogs were in draft status before adding taxonomy/evidence, but direct database writes and concurrent status transitions were not protected by a database-enforced invariant.
- Root cause: The taxonomy tables had owner/admin RLS policies but no database trigger that serialized child-row changes with catalog status transitions.
- Fix: Added an invoker-security trigger function for owner and shared-reference chapter, topic and evidence tables. Inserts, updates and deletes now lock the relevant chapter/catalog rows in deterministic order and require every affected catalog to remain in draft status. Catalog status changes and taxonomy writes therefore serialize on the parent catalog row. The trigger function is not directly executable by client roles.
- Verification: Migration/source review only. The migration has not been applied to a database; trigger execution under owner/admin RLS, lifecycle transition races, cross-catalog moves and rollback cases remain deferred to the dedicated testing and fixing phases.
- Status: Migration committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-101 — Verified and retired syllabus catalogs could be reopened by direct status updates

- Date: 2026-11-01
- Area: Owner and shared-reference syllabus catalog lifecycle
- Symptom: Taxonomy writes are now restricted to draft catalogs, but the catalog tables' broad owner/admin update policies still allowed a direct status update to move a verified catalog back to draft or a retired catalog back to an active state.
- Root cause: Catalog status constraints validated allowed status values and verification metadata, but did not enforce monotonic lifecycle transitions.
- Fix: Added database triggers for owner and shared-reference catalogs that reject verified-to-draft and retired-to-any-active-state transitions. Draft-to-verified, draft-to-retired and verified-to-retired transitions remain compatible with the existing application actions.
- Verification: Migration/source review only. The migration has not been applied to a database; direct status-update authorization and lifecycle transition cases remain deferred to the dedicated testing and fixing phases.
- Status: Migration committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-102 — Verified syllabus catalog metadata could be changed without re-verification

- Date: 2026-11-01
- Area: Owner and shared-reference syllabus catalog provenance
- Symptom: Even after taxonomy writes and status regressions were blocked, broad owner/admin update policies could still alter a verified catalog's board, qualification, subject, version, effective dates or source provenance while leaving its status verified.
- Root cause: The database did not make verified/retired catalog metadata immutable; application UI restrictions alone could not protect direct Data API writes.
- Fix: Added invoker-security triggers on both owner and shared-reference catalog tables. Once a catalog leaves draft, every field other than lifecycle status and the automatic updated_at timestamp is immutable. The existing verified-to-retired transition remains allowed, but its metadata cannot change.
- Verification: Migration/source review only. The migration has not been applied to a database; direct Data API updates, status transitions and RLS behavior remain deferred to the dedicated testing and fixing phases.
- Status: Migration committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-103 — Document processing failure state could partially persist

- Date: 2026-11-01
- Area: Manual and background document-processing failure handling
- Symptom: Both processing routes updated the document to failed and the running processing job to failed in separate requests. A partial failure could leave a failed document with a running job, or the reverse.
- Root cause: Failure-state persistence was split across independent PostgREST transactions even though the successful completion path had been made atomic.
- Fix: Added the owner-authorized fail_document_processing RPC. It validates either the trusted service role or authenticated owner, locks the matching running job, updates the owner-scoped document and job failure state in one transaction, and chooses a bounded safe error message from an allow-listed error code. Both manual and background processing routes now call it.
- Verification: Source/migration review only. The migration has not been applied to a database; RLS, role authorization, rollback and concurrent completion-versus-failure cases remain deferred to the dedicated testing and fixing phases.
- Status: Migration, both processing routes, database types and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-104 — Crashed document jobs could remain running after exhausting all retries

- Date: 2026-11-01
- Area: Background document worker retry exhaustion
- Symptom: A worker crash on the final allowed attempt left the job in running state. The retry policy correctly refused another attempt, but the worker also skipped the exhausted job, leaving the document stuck in processing indefinitely.
- Root cause: The candidate loop skipped every job whose attempt count reached max_attempts without terminalizing stale running leases.
- Fix: Added the service-role-only terminalize_exhausted_stale_document_job RPC. It locks the exact stale lease observed by the worker, rechecks that the retry budget is exhausted and the lease is still at least 15 minutes old, then marks both the document and job failed in one transaction. The worker passes the observed started_at value so a newer claim cannot be failed by a stale candidate snapshot.
- Verification: Source/migration review only. The migration has not been applied to a database; stale lease races, final-attempt crashes, timestamp equality, role authorization and rollback behavior remain deferred to the dedicated testing and fixing phases.
- Status: Migration, worker route, database types and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-105 — Readiness monitoring lacked a response-time threshold and optional operations alert

- Date: 2026-11-01
- Area: Production readiness monitoring
- Symptom: The scheduled readiness workflow checked HTTP status and the generic ready response, but a severely slow readiness endpoint still passed. Failures also depended entirely on GitHub Actions notification preferences, with no optional operations webhook.
- Root cause: The monitor had no explicit latency threshold and no configurable external alert destination.
- Fix: Added a 10-second per-run readiness latency threshold and an optional HTTPS Slack-compatible incoming webhook notification on workflow failure. The webhook sends only a generic message and run URL; delivery errors do not expose the secret or mask the original workflow failure. Updated operations documentation with the optional secret and limitations.
- Verification: Workflow/source review only. The workflow has not run against a deployed environment; threshold calibration, webhook delivery and scheduled default-branch activation remain pending operational acceptance.
- Status: Workflow and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-106 — Rejected document uploads consumed quota and concurrent requests could overshoot limits

- Date: 2026-11-01
- Area: Google Drive document-upload admission quota
- Symptom: The upload quota function incremented both hourly and daily counters before deciding whether the request was allowed. A request rejected by the hourly limit still consumed daily quota, and concurrent requests could race past either limit.
- Root cause: The function performed independent upserts without a per-owner transaction lock or a read-both/check-both/write-both admission sequence.
- Fix: Added a forward-only migration that serializes quota decisions per owner, captures the quota timestamp after acquiring the lock, checks both counters before mutating either, and increments both only for admitted requests. Existing limits remain 10 uploads per UTC hour and 50 per UTC day; prior over-limit counter values remain blocking until their windows expire.
- Verification: Source/migration review only. The migration has not been applied to a database; concurrency, quota boundary, expiry and rollback cases remain deferred to the dedicated testing and fixing phases.
- Status: Migration committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-107 — Delayed or concurrent AI generation requests could use an expired quota window

- Date: 2026-11-01
- Area: AI solution and chapter-note generation quotas
- Symptom: The 15-minute quota bucket timestamp was captured before the counter upsert. A request delayed while waiting on a concurrent row update could be assigned to an expired window, and denied requests continued incrementing the capped counter.
- Root cause: Quota-window calculation occurred before serialization, with no owner-and-bucket admission lock or explicit pre-write limit check.
- Fix: Added a forward-only migration that serializes quota admission per owner and bucket, captures the timestamp after lock acquisition, checks the current bucket count before writing, and increments only admitted requests. Existing limits remain five AI solutions or three chapter notes per 15-minute window.
- Verification: Source/migration review only. The migration has not been applied to a database; concurrency, window-boundary, legacy over-limit row and rollback behavior remain deferred to the dedicated testing and fixing phases.
- Status: Migration committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.


## ERR-108 — Job claims and stale recovery could split document and job lifecycle state

- Date: 2026-11-01
- Area: Manual and background document-processing claim/recovery
- Symptom: Both processing routes claimed a job as running and changed the parent document to processing in separate writes. Manual stale recovery also marked the job failed before separately changing the document. A crash or second-write failure could leave mismatched states.
- Root cause: Claim, stale recovery and parent-document transitions were not grouped into database transactions; application-level stale checks alone could race with a newer worker lease.
- Fix: Added owner/service-role-authorized claim_document_processing_job and recover_stale_document_processing_job RPCs. Claims now lock and revalidate the exact expected job status, attempt count and lease timestamp, enforce the 15-minute stale threshold in the database, and update both job and document atomically. Manual and background routes now use the RPCs instead of separate writes.
- Verification: Source/migration review only. The migration has not been applied to a database; concurrent claim, lease renewal, stale recovery, RLS and retry-boundary behavior remain deferred to the dedicated testing and fixing phases.
- Status: Migration, both processing routes, database types and documentation committed to feature/m3-ai-solver; no tests, typecheck or build were run during implementation.




## ERR-109 — Manual OCR correction could partially update page and document state

- Date: 2026-11-01
- Area: Manual document review / OCR correction
- Symptom: Saving a correction updated the page row and parent document status in two separate database requests. A failure between requests could leave corrected text without the parent document returning to review_required, or leave an inconsistent review state.
- Root cause: The server action treated page content and parent review status as independent writes.
- Fix: Added the owner-authorized save_document_page_correction RPC. It validates the text and page/document/owner relationship, locks the processing job, document and page in a consistent order, refuses edits during active processing, and commits the manual page text plus parent review_required state as one transaction. The server action now calls only this RPC.
- Verification: Source/migration review only. No tests, typecheck, build or CI were run during implementation. Database rollback, owner isolation, active-worker race and post-approval correction behavior remain for the dedicated testing phase.
- Status: Migration, route action, database types and documentation committed to feature/m3-ai-solver; migration not applied to any hosted database.


## ERR-110 — Manual stale-job recovery used two transactions before restarting OCR

- Date: 2026-11-01
- Area: Manual document processing / stale-job recovery
- Symptom: A stale running job with retry budget remaining was first transitioned to failed, then claimed in a second RPC. Both transitions were individually atomic, but a crash between them left a recoverable failed job and introduced an unnecessary intermediate state.
- Root cause: The manual route used the stale-recovery RPC before invoking the atomic claim RPC, although the claim RPC already supports an exact stale running lease.
- Fix: For stale jobs with retry budget remaining, the manual route now calls claim_document_processing_job with the originally observed running status, attempt count and started_at. The database atomically validates staleness, increments the attempt and transitions both job and document to processing. The recovery RPC is retained for exhausted stale jobs, where both rows are terminalized as failed in one transaction.
- Verification: Source/migration review only. No tests, typecheck, build or CI were run during implementation. Concurrent manual/worker claim races, retry exhaustion and exact lease timestamp checks remain for the dedicated testing phase.
- Status: Route and operational documentation committed to feature/m3-ai-solver; no database changes applied to a hosted environment.




## ERR-111 — Private syllabus verification invariants depended on dashboard validation

- Date: 2026-11-01
- Area: Private syllabus catalogue lifecycle
- Symptom: The dashboard checked for an HTTPS source URL before verification, but direct database/API updates could set status to verified with a client-supplied source_checked_at value and without a populated chapter structure. The database's earlier check constraint did not require a source title or any chapters.
- Root cause: Lifecycle requirements were split between application code, a basic table check and partial status-regression triggers.
- Fix: Added guard_private_syllabus_catalog_lifecycle. New private catalogues must start as drafts; verification requires an HTTPS source URL, non-empty source title and at least one chapter; source_checked_at is generated by PostgreSQL at transition time; owner transfer and client timestamp forgery are rejected; verified catalogues may only remain verified or be retired; retired catalogues reject updates. The dashboard now sends only the status transition and displays the source-title requirement.
- Verification: Source/migration review only. No tests, typecheck, build or CI were run. Migration has not been applied to a hosted database. Direct SQL/service-role policy, existing draft rows with pre-populated source_checked_at, status transition matrix, trigger ordering and concurrent taxonomy/verification behavior remain for the dedicated testing phase.
- Status: Migration, dashboard action, user-facing message and documentation committed to feature/m3-ai-solver; no hosted database was changed.


## ERR-112 — Production deployment configuration and release gates were fragmented

- Date: 2026-11-01
- Area: Production readiness / deployment operations
- Symptom: The project had individual setup and operations documents, but no single controlled deployment runbook or release gate. The example environment omitted the server-only Supabase service-role key and shared cron secret, and there was no repeatable environment preflight before deployment.
- Root cause: Production configuration requirements had grown across Supabase, Google Drive, AI provider, worker and readiness-monitor features without one consolidated preflight and release checklist.
- Fix: Added `scripts/validate-production-env.mjs` and `npm run check:production-env`. The preflight validates required environment presence, HTTPS URLs, exact Google callback path, canonical 32-byte Drive encryption key, minimum cron-secret length and enabled AI task coverage; it never prints secret values. Added the missing `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` placeholders to `.env.example`. Added `docs/DEPLOYMENT.md`, `docs/PRODUCTION_READINESS.md` and `docs/INCIDENT_RESPONSE.md`, and linked them from README and the roadmap.
- Verification: Implementation/source review only. The preflight was not executed, and no tests, typecheck, build, CI, migration, hosted configuration, restore drill, alert delivery or deployment was performed. The full Auth identity recovery limitation on Supabase Free remains an explicit release blocker.
- Status: Script, package command, environment template and documentation committed to `feature/m3-ai-solver`; production is not approved.


## ERR-113 — First full verification pass exposed lint, worker-log, upload-narrowing and fixture drift

- Date: 2026-11-01
- Area: CI verification / document worker / resumable uploads / mark-scheme tests
- Symptom: The first foundation workflow stopped at an unescaped apostrophe in the question workspace. Once lint was corrected, application type-checking exposed two unregistered worker recovery log events, two possible-undefined page-count accesses in resumable upload session validation, and three mark-scheme test calls missing the now-required source locator.
- Root cause: The web-research notice was not JSX-escaped; the safe operational event allow-list had not been extended with the newly added atomic job recovery events; the upload-session type guard did not explicitly narrow the optional pageCount property; and mark-scheme fixtures had not been updated when source provenance became mandatory.
- Fix: Escaped the apostrophe in the notice; added both recovery events to the safe-log union; explicitly narrowed pageCount to number before numeric validation; and supplied a source locator in the shared mark-scheme test fixture. No validation was weakened or skipped.
- Verification: On feature/m3-ai-solver commit 46aa2aec35f950044b20c3c82f8b115e2f6508cd, Foundation CI completed successfully: ESLint, application type-check, Playwright configuration type-check, authenticated E2E type-check, 23 unit-test files / 121 tests, and production build all passed. Local Supabase migration/pgTAP CI passed 7 SQL files / 177 assertions. Secret scanning passed. Browser Chromium smoke tests were still running when this entry was written; authenticated two-account acceptance was skipped because ENABLE_AUTHENTICATED_E2E and the dedicated non-production Supabase/account secrets are not configured. Live AI-provider generation and production environment preflight remain unverified.
- Status: Corrections committed to feature/m3-ai-solver. This entry records observed CI results only; it does not declare overall project testing complete or approve production deployment.


## ERR-114 — Readiness could report healthy with most feature tables missing

- Date: 2026-11-01
- Area: Production readiness / partial database migration detection
- Symptom: The protected readiness endpoint could return `ready` when the Supabase Data API and only the three core tables were reachable, even if solver, teacher-review, syllabus, chapter-note or study-workflow migrations were absent.
- Root cause: The readiness probe checked connectivity and a minimal document-processing subset rather than the required schema surface used by the shipped application.
- Fix: Expanded the bounded parallel zero-row HEAD probes to cover document pages and Drive connections, questions/solutions/teacher reviews, private/shared syllabus taxonomy, chapter-note records, revision tracking, practice history and weekly study sessions. No row content is returned. Readiness now fails closed when any required table is missing.
- Verification: Source/documentation change only. No tests, typecheck, build, workflow run or hosted schema change was performed; runtime behavior and the exact required-table list remain for the dedicated testing phase.
- Status: Route and operations/README/roadmap documentation committed to `feature/m3-ai-solver`; no hosted database migration was applied.


## ERR-115 — Accepted teacher invitation history disappeared after account email change

- Date: 2026-11-01
- Area: Teacher invitation inbox / identity lifecycle
- Symptom: The incoming invitation page filtered every row by the account's current email. An accepted teacher who later changed their Auth email could lose the accepted/revoked invitation history from the inbox even though the database correctly retained the relationship by Auth user ID.
- Root cause: The UI treated email as the durable identity after acceptance instead of using the immutable authenticated user ID for accepted invitation history.
- Fix: Load pending/current-email invitations and accepted-by-current-user invitations separately, merge and de-duplicate by invitation ID, then sort and cap the combined history. RLS remains the authorization boundary; the user-ID query does not grant access to question content.
- Verification: Source/documentation change only. No tests, typecheck, build, browser run or hosted database change was performed; email-change and revocation visibility acceptance remain in the deferred testing phase.
- Status: Teacher invitation page and M4 documentation committed to `feature/m3-ai-solver`.


## ERR-116 — Privacy disclosures existed only in internal documentation

- Date: 2026-11-01
- Area: User-facing privacy and data transparency
- Symptom: The repository documented Google Drive, Supabase, optional AI/search processing and backup limitations, but signed-in users and invited teachers had no public in-app notice explaining those data flows, cookie use, retention gaps or the current self-service deletion limitation.
- Root cause: Privacy/security documentation was maintained as engineering guidance rather than surfaced as a user-facing product disclosure.
- Fix: Added `/privacy` with plain-language descriptions of account roles, stored academic records, Google Drive storage and token encryption, opt-in AI/source-page retrieval, manually initiated web research, cookies/time-zone handling, retention/deletion limitations and the current non-production status. Added links from both the public landing page and sign-in screen.
- Verification: Source/documentation change only. No tests, typecheck, build, browser, legal review or runtime deployment was performed. Confirm wording against the final deployed data flows, add a responsible contact channel, and complete accessibility/legal review during the dedicated testing and release-acceptance phases.
- Status: Privacy page and landing-page link committed to `feature/m3-ai-solver`; no external service or database was changed.


## ERR-117 — Public landing page described completed workflows as planned

- Date: 2026-11-01
- Area: Product status and user-facing accuracy
- Symptom: The landing page still labeled the question library, document intake, bilingual solver and chapter intelligence as planned and described the app as a Foundation/Milestone 1 build, despite substantial M1–M7 implementation on the feature branch.
- Root cause: Public product copy was not updated as implementation scope expanded.
- Fix: Replaced the stale planned modules with the current document-intake, question-solver, syllabus/chapter-note and exam-preparation workflows. The page now labels them "In code" and explicitly says external integrations require setup; it no longer implies the branch is only a Foundation build.
- Verification: Source/documentation change only. No tests, typecheck, build or browser acceptance was run. Confirm copy against the shipped branch and verify mobile presentation during the dedicated testing phase.
- Status: Landing page updated on `feature/m3-ai-solver`; no deployment or external service was changed.


## ERR-118 — Private workspace URLs lacked explicit crawler exclusion

- Date: 2026-11-01
- Area: Privacy metadata / search indexing
- Symptom: Authentication middleware protected dashboard content, but the application had no explicit crawler policy and no `X-Robots-Tag` response header for dashboard/API routes. The sign-in page also inherited indexable root metadata.
- Root cause: Authorization and search-indexing controls were treated as the same concern; robots directives and response-level no-index metadata had not been implemented.
- Fix: Added a Next.js robots route allowing only the public landing/privacy pages and disallowing dashboard, API and sign-in paths. Added `noindex, nofollow, noarchive` response headers to dashboard/API/sign-in paths, preserved the header through authentication redirects, and set sign-in metadata to no-index.
- Verification: Source change only. No tests, build, browser, crawler simulation or deployment was performed. Search engines are not guaranteed to immediately remove already indexed URLs; authorization remains the actual confidentiality boundary.
- Status: Crawler policy and response metadata committed to `feature/m3-ai-solver`; no database or external service was changed.


## ERR-119 — Forced-colors mode lacked explicit application-level affordances

- Date: 2026-11-01
- Area: Accessibility / operating-system high contrast
- Symptom: The application had keyboard focus styling and mobile touch-target sizing, but no explicit forced-colors treatment for major panel boundaries, status notices or progress indicators.
- Root cause: Accessibility styling covered default dark-theme presentation and reduced motion, but did not include a dedicated Windows High Contrast / forced-colors adaptation.
- Fix: Added a forced-colors media query that retains visible Highlight focus outlines, CanvasText panel/notice boundaries and system-color progress/status indicators without disabling the browser's automatic color adaptation.
- Verification: Source/CSS and documentation change only. No browser, Windows High Contrast, keyboard, screen-reader or visual-regression testing was performed. Confirm all interactive states and information remain distinguishable during the dedicated acceptance phase.
- Status: CSS affordance committed to `feature/m3-ai-solver`; accessibility acceptance remains open.


## ERR-120 — Dashboard redirects did not inherit the private no-store cache policy

- Date: 2026-11-01
- Area: Middleware / private response caching
- Symptom: Authenticated dashboard responses received `Cache-Control: private, no-store`, but middleware did not set the header until after successful authentication. Dashboard redirects for missing configuration or expired sessions could therefore leave the middleware without an explicit private no-store policy.
- Root cause: The cache header was assigned only on the authenticated success path rather than before the authentication branch.
- Fix: Middleware now sets `Cache-Control: private, no-store` on dashboard and API paths before authentication branching. Existing auth-response copying preserves the header across redirects.
- Verification: Source change only. Browser/network acceptance for successful pages, API success/error responses, redirects, sign-out and account switching remains pending.
- Status: Implemented on `feature/m3-ai-solver`; runtime verification deferred to the dedicated testing phase.


## ERR-121 — Auth cookie refresh could discard response policy headers

- Date: 2026-11-01
- Area: Middleware / cache and crawler policy
- Symptom: When Supabase refreshed authentication cookies during the dashboard middleware request, the cookie callback rebuilt the NextResponse. The replacement response could lose headers assigned before authentication, including the private no-store cache policy and no-index crawler directive.
- Root cause: The response-recreation path copied the CSP by construction but did not carry forward the other response policy headers already applied to the original response.
- Fix: Added one shared response-policy header copier and invoke it whenever the middleware rebuilds its response for refreshed auth cookies. Redirect handling uses the same helper, keeping cache, CSP and crawler policy handling consistent.
- Verification: `lib/http/response-policy-headers.test.ts` and `tests/middleware-auth-refresh.test.ts` passed in Foundation run `41312165056` on commit `443db3ed22bdb3c2086d1ba476b82a33eb870885`. The middleware test simulates Supabase `setAll` on authenticated and expired-session paths and verifies CSP/cache/crawler headers, refreshed cookie attributes, and the updated downstream request cookie. A real Supabase session refresh remains an integration check.
- Status: Unit and middleware-simulation regressions verified; live Supabase refresh acceptance remains open.


## ERR-122 — Bounded HTTP response reader rejected numeric Content-Length headers

- Date: 2026-11-01
- Area: HTTP response handling / Google and AI provider integrations
- Symptom: Responses carrying an ordinary numeric `Content-Length` header were rejected as invalid before their bodies could be read. This affected bounded response handling for upstream Google and AI HTTP calls.
- Root cause: The decimal-digit regular expression was double-escaped in a regular-expression literal, so it matched a literal backslash followed by `d` rather than one or more digits.
- Fix: Corrected the expression to accept decimal digits while retaining the existing invalid-length and maximum-byte checks. Added focused regression coverage for numeric, malformed, oversized and absent content-length headers.
- Verification: `tests/read-limited-response.test.ts` passed in Foundation run `41312165056` on commit `443db3ed22bdb3c2086d1ba476b82a33eb870885`, alongside the complete unit suite and production build. Live upstream Google/AI response behavior remains a separate integration check.
- Status: Unit regression coverage verified; live provider integration remains open.


## ERR-123 — Resumable upload page-count invariant differs from database registration

- Date: 2026-11-01
- Area: Document intake / database validation
- Symptom: The resumable upload start and chunk routes accept only page counts from 1 through 50, while the server-only register_uploaded_document RPC still accepts 0 through 100.
- Root cause: The route-level upload limit was tightened without updating the database function's independent validation invariant.
- Impact: The RPC is revoked from public, anon and authenticated roles and is called only by the server route, so this is not currently a direct browser authorization bypass. It is still an inconsistent defense-in-depth contract and permits invalid registration metadata if another trusted caller is introduced.
- Fix: Added forward-only migration `20261101140000_tighten_uploaded_document_page_count.sql` (ERR-130). The replacement RPC rejects every non-null page count outside 1–50 while preserving owner validation, advisory locking, duplicate handling, atomic document/job creation and the server-only execute grant. The historical migration remains unchanged.
- Verification: Applied through the complete ordered migration chain on a fresh isolated local Supabase database in CI run `41309812359` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`. The atomic document workflow pgTAP suite verifies page counts 1, 50 and null are accepted; 0, 51 and 100 are rejected; duplicate handling, owner-scoped deduplication, document/job atomicity, rollback on job failure, and authenticated/anon execute denial are covered. Hosted-project application and live concurrency acceptance remain outstanding.
- Status: Isolated database acceptance passed; hosted migration reconciliation and target approval remain open.

## ERR-124 — Development ESLint toolchain retains a legacy minimatch major
- Date: 2026-11-01
- Area: Development dependency security / supply chain
- Symptom: The lockfile resolves `minimatch@3.1.5` for ESLint 9.39.5, `@eslint/config-array`, `@eslint/eslintrc`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and `eslint-plugin-react`. Only the `@typescript-eslint/typescript-estree` subtree is overridden to minimatch 11.0.3. The GitHub-reviewed [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) / CVE-2026-118764 advisory lists versions before 11.0.1 as affected.
- Security context: The advisory lists minimatch versions before 11.0.1 as affected and 11.0.1 as fixed. The current legacy v3 dependency therefore remains in the affected range according to the advisory. The published technical description highlights an amplification path in minimatch 10.2.6 at optimizationLevel >= 2; actual exploitability through this project's trusted development-toolchain patterns still needs review. This is a development-toolchain dependency, not evidence that minimatch is bundled into the production browser/runtime artifact.
- Root cause: The current Next.js 15 / eslint-config-next 15 / ESLint 9 toolchain constrains the legacy minimatch major. Forcing minimatch 11 into the existing dependency graph without checking CommonJS/named-export and consumer compatibility risks breaking ESLint.
- Fix plan: Select a supported, compatible lint-toolchain migration (or a narrowly scoped compatibility patch), refresh the lockfile, and ensure every minimatch instance resolves to a version outside the advisory's affected range. Review the Next.js 16 migration requirements before upgrading the app framework; do not blindly bump only eslint-config-next.
- Verification: Static lockfile inspection only. No npm audit, install, lint, typecheck or build was run in the implementation phase.
- Status: Open engineering/security blocker; remediation and full dependency audit remain pending.


## ERR-125 — Encrypted Drive values accepted non-canonical serialized forms
- Date: 2026-11-01
- Area: Google Drive token/session encryption
- Symptom: The AES-256-GCM decoder split the stored value into four fields but did not reject trailing segments, and Base64/Base64URL decoding relied on Node's permissive decoder without checking canonical representation or IV/tag lengths.
- Root cause: The persisted-value parser relied on successful cryptographic decoding rather than enforcing the exact versioned wire format and bounded input sizes.
- Fix: Require exactly four segments, canonical Base64URL encoding, a 12-byte IV, a 16-byte authentication tag, non-empty ciphertext and bounded plaintext/ciphertext sizes. Require the encryption key to use canonical padded Base64 for exactly 32 bytes.
- Regression coverage: Added \`lib/drive/crypto.test.ts\` for round trips, malformed extra segments, non-canonical keys, invalid IV/tag lengths and size limits. Tests are authored but not executed.
- Verification: The encrypted Drive secret unit suite passed in Foundation CI run `41309812309` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; it covers refresh-token/upload-session round trips, non-canonical keys, extra segments, IV/tag length rejection and size limits. Live compatibility with previously stored production tokens remains unverified.
- Status: Unit regression coverage passed; deployed-key and existing-token acceptance remains open.

## ERR-126 — Drive resumable chunk validator accepted unsafe total-byte integers
- Date: 2026-11-01
- Area: Resumable Google Drive upload validation
- Symptom: The chunk validator checked safe integer ranges for start/end offsets but did not independently require the parsed total and caller-supplied total byte count to be safe positive integers.
- Root cause: The total values were compared for equality without validating that JavaScript could represent them exactly.
- Fix: Require parsed total, caller total and byte length to be safe integers; require total values to be positive before validating chunk alignment and bounds.
- Regression coverage: Added an unsafe-integer total-size case to \`lib/drive/resumable-upload.test.ts\`. Tests are authored but not executed.
- Verification: The resumable Drive upload unit suite passed in Foundation CI run `41309812309` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; it covers valid 1 MB/final chunks, malformed ranges, bounds and an unsafe-integer total.
- Status: Unit regression coverage passed; live Drive resumable-upload acceptance remains open.

## ERR-127 — Chemistry atom-count checker accepted empty formula groups
- Date: 2026-11-01
- Area: Deterministic chemistry equation checks
- Symptom: A malformed formula such as \`H()2\` could be parsed as if the empty parenthesized group contributed no atoms, allowing an unsupported formula to receive a misleading atom-count result.
- Root cause: The recursive formula parser accepted a closing parenthesis without requiring at least one element in the group.
- Fix: Reject nested formula groups that contain no elements before applying their multiplier.
- Regression coverage: Added an empty-group case to \`tests/chemistry-check.test.ts\`. Tests are authored but not executed.
- Verification: The chemistry checker unit suite passed in Foundation CI run `41309812309` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; it confirms empty groups such as `H()2` are uncheckable while valid nested formulae remain supported.
- Status: Unit regression coverage passed.

## ERR-128 — Chemistry atom-count checker accepted unknown element symbols
- Date: 2026-11-01
- Area: Deterministic chemistry equation checks
- Symptom: The formula tokenizer accepted any one- or two-letter capitalized token as an element, including symbols that are not on the periodic table. Such a typo could receive a misleading balanced result.
- Root cause: Formula tokenization validated capitalization and token length but did not validate the symbol against the supported element set.
- Fix: Validate parsed symbols against the 118 recognized chemical element symbols. Unsupported or unknown symbols now produce an uncheckable result.
- Regression coverage: Added an unknown-symbol equation to \`tests/chemistry-check.test.ts\`. Tests are authored but not executed.
- Verification: The chemistry checker unit suite passed in Foundation CI run `41309812309` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; it confirms unknown symbols such as `Xx` are uncheckable while supported formulae remain covered.
- Status: Unit regression coverage passed.

## ERR-129 — Physics unit parser treated inherited object properties as unit definitions
- Date: 2026-11-01
- Area: Deterministic physics dimensional checks
- Symptom: Unit names such as \`constructor\` and \`toString\` resolved through the JavaScript object prototype instead of being reported as unknown units.
- Root cause: The SI unit lookup used a normal object index without checking that the key was an own property.
- Fix: Require \`Object.hasOwn\` before reading a unit definition; unknown prototype property names now produce an uncheckable result.
- Regression coverage: Added \`constructor\` and \`toString\` cases to \`tests/physics-unit-check.test.ts\`. Tests are authored but not executed.
- Verification: The physics unit checker suite passed in Foundation CI run `41309812309` at commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; inherited property names `constructor` and `toString` are explicitly rejected as uncheckable.
- Status: Unit regression coverage passed.

## ERR-130 — Uploaded document registration RPC accepted invalid page counts

- Date: 2026-11-01
- Area: Document intake / database validation
- Symptom: The server-only registration RPC accepted non-null page counts from 0 through 100 while the upload routes enforce 1 through 50.
- Root cause: The RPC's independent metadata validation was not updated when the route contract was tightened.
- Fix: Added forward-only migration `20261101140000_tighten_uploaded_document_page_count.sql`. It recreates the existing function with the 1–50 invariant, retains the owner check, advisory lock, duplicate handling, atomic document/job insertion and explicitly restates the service_role-only execute grant. The historical migration is unchanged.
- Verification: Migration source reviewed only. It has not been applied and no pgTAP, migration, typecheck, build or runtime test was run. Boundary cases 0, 1, 50, 51, 100 and NULL, effective ACLs and atomic/idempotent behavior remain for the testing phase.
- Status: Implementation committed to `feature/m3-ai-solver`; hosted database unchanged.



ERR-123 implementation closure note (2026-11-01): the required forward-only migration is now committed as `supabase/migrations/20261101140000_tighten_uploaded_document_page_count.sql` (ERR-130). ERR-123 is no longer an open source-implementation blocker. Its migration-application, ACL and page-count boundary acceptance remains unverified and is intentionally deferred to the testing phase.



ERR-124 compatibility investigation (2026-11-01): the existing lockfile already isolates `minimatch@11.0.3` for `@typescript-eslint/typescript-estree`, but the root `minimatch@3.1.5` remains required by legacy ESLint consumers including `@eslint/config-array`, `@eslint/eslintrc`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and `eslint-plugin-react`. The upstream minimatch changelog records that version 9 removed the default export; forcing version 11 across consumers that declare the 3.x range can therefore break their import/API assumptions. Current ESLint 10.14.0 still depends on minimatch 10.2.6, which is below the new advisory's fixed 11.0.1 threshold; upgrading ESLint alone does not close this advisory. Do not apply a global override or hand-edit the lockfile. A safe fix requires compatible upstream consumer releases, a reviewed compatibility shim/fork with reproducible lockfile generation, or an updated advisory assessment proving the 3.x implementation is not affected. No dependency files were changed in this investigation; audit and runtime verification remain pending.



## ERR-131 — Classification confidence label implied an automated calibrated score

- Date: 2026-11-01
- Area: M5 syllabus-assisted classification / user-facing accuracy
- Symptom: The classification editor labelled a manually entered 0–1 value as “Classifier confidence”, which could imply that the application generated or calibrated the score. The current matcher only ranks lexical overlap and does not produce a probability.
- Root cause: The numeric field was retained from the original classification schema after assisted suggestions were deliberately constrained to transparent text matching.
- Fix: Renamed the field to “Owner-estimated confidence” and explicitly state that it is a human estimate, not a model prediction or calibrated probability. Users are told to leave it blank when they cannot justify a value; the review-state and source-evidence requirements remain separate.
- Verification: Source review only. No UI/browser or regression test was run during implementation.
- Status: UI wording corrected on `feature/m3-ai-solver`; broader calibration remains impossible to claim until a sufficiently sized, independently labelled dataset exists and is evaluated in the later testing/quality phase.



## ERR-132 — AI provider fallback retried permanent HTTP failures

- Date: 2026-11-01
- Area: M3 AI provider routing / cost and reliability
- Symptom: When provider fallback was enabled, the router attempted the next configured provider after any `AIProviderError`, including permanent HTTP 4xx responses such as invalid requests, authentication failures, missing models and payload-size rejection.
- Root cause: Fallback eligibility was based only on the error class and the global opt-in flag, not on whether another provider could plausibly recover the request.
- Fix: Added an explicit retryability policy. Fallback is limited to network/timeout unavailability, malformed or empty provider responses, and HTTP 408, 425, 429 or 5xx. Permanent 4xx failures stop immediately. Updated provider setup documentation and added regression cases for permanent 4xx, transient 503 and fallback-disabled behavior.
- Verification: Source and regression-test changes reviewed only. Tests were not executed in the implementation phase; live provider behavior, actual cost and retry timing remain unverified.
- Status: Implementation committed to `feature/m3-ai-solver`; regression and provider acceptance deferred to the testing phase.


## ERR-133 — Readiness monitor omitted required feature and quota tables

- Date: 2026-11-01
- Area: M8 production readiness / database schema detection
- Symptom: The protected readiness endpoint probed the primary workflow tables but omitted persisted tables used by quota enforcement, web-research provenance, mark-scheme review, syllabus evidence, platform-curator access and classification history. A partially migrated database could therefore return `ready` while one or more implemented workflows would fail when used.
- Root cause: The readiness probe inventory was maintained inline and was not kept in sync as later feature migrations added tables.
- Fix: Extracted the required table inventory into `lib/health/required-readiness-tables.ts` and added the omitted feature/quota tables. The readiness endpoint still performs bounded zero-row HEAD probes and returns no academic data. Added a regression test for the critical table inventory and duplicate entries.
- Verification: Source review only. The regression test is authored but not executed; live database readiness behavior remains deferred to the testing phase.
- Status: Implementation committed to `feature/m3-ai-solver`; runtime verification remains pending.


## ERR-134 — Readiness monitor accepted non-origin URL forms and unbounded response bodies

- Date: 2026-11-01
- Area: M8 scheduled operational monitor
- Symptom: The workflow's regular-expression check for `APP_BASE_URL` could accept malformed origin-like strings containing URL components that are not valid for an application origin. The curl response was time-limited but did not have an explicit maximum response size.
- Root cause: Configuration validation checked only a string prefix/pattern, and the HTTP client relied on the readiness endpoint remaining small.
- Fix: Validate `APP_BASE_URL` with Node's URL parser and require HTTPS, a hostname, no embedded credentials, root path only, and no query or fragment. Replaced curl body buffering with a Node fetch stream reader that aborts after 4 KiB, rejects redirects, and checks the generic JSON readiness status without printing response content. The workflow still avoids printing response bodies or secrets.
- Verification: Workflow source review only. GitHub Actions execution remains deferred to the testing/operational acceptance phase.
- Status: Implemented on `feature/m3-ai-solver`; scheduled monitor activation still requires deployment and owner-configured repository secrets.

## ERR-135 — Credential-bearing provider requests followed redirects

- Date: 2026-11-01
- Area: M2 Google Drive integration / M3 AI and web-research providers
- Symptom: Several outbound requests carrying OAuth credentials, bearer tokens or provider API keys relied on the Fetch default redirect behavior. A provider-controlled or unexpected redirect should not be allowed to change the destination of a credential-bearing request.
- Root cause: Request timeout and response-size limits were implemented, but redirect policy was not consistently explicit across external provider calls.
- Fix: Set `redirect: "error"` for AI completion, Brave search, Google OAuth token exchange/revocation, Drive metadata/upload/download/export, worker token-refresh and Supabase service-role requests. The protected readiness probes also reject redirects. The Drive resumable upload chunk request retains `redirect: "manual"` because its protocol requires the caller to inspect the response status and Google-confirmed offset; the session URL is separately restricted to the exact Google upload host and path. Added regression coverage for AI, Brave and service-role transport options.
- Verification: Source review only. Regression tests are authored but not executed; Google/AI/Brave live provider behavior remains deferred to the testing phase.
- Status: Implemented on `feature/m3-ai-solver`; no provider credentials were used and no external requests were made.


## ERR-136 — Document worker bypassed hardened service-role transport

- Date: 2026-11-01
- Area: M2 background document processing / Supabase service-role transport
- Symptom: The scheduled document worker constructed its own Supabase service-role client directly. That bypassed the shared client transport added for ERR-135, so worker database requests did not explicitly reject redirects.
- Root cause: The service-role client hardening was applied to the shared factory and upload route, but the worker retained an older inline client construction.
- Fix: Replaced the worker's direct Supabase client construction with `createSupabaseServiceRoleClient()`, preserving the existing early 503 response when required credentials are absent. All worker service-role Data API and RPC calls now use the shared redirect-rejecting transport.
- Verification: Source review only. No tests, typecheck, build, lint, audit, CI or live worker invocation was run. Regression test execution and runtime acceptance remain deferred to the testing phase.
- Status: Source fix committed to `feature/m3-ai-solver`.


## ERR-137 — Supabase authenticated SSR clients followed redirects

- Date: 2026-11-01
- Area: Authentication / Supabase server-side transport
- Symptom: The authenticated Supabase clients used by Next.js middleware and server routes relied on the Fetch default redirect behavior. A redirect from the configured Supabase origin was not explicitly rejected.
- Root cause: Redirect hardening covered service-role and provider requests but had not been applied consistently to cookie-backed SSR Auth/Data API clients.
- Fix: Added a shared `supabaseFetch` transport that sets `redirect: "error"`; applied it to the server-component/server-route client, middleware auth client and service-role client. Added a regression test for the shared transport.
- Verification: Source review only. The regression test is authored but not executed. Auth refresh, middleware cookie preservation and live Supabase behavior remain for the testing phase.
- Status: Source implementation committed to `feature/m3-ai-solver`.


ERR-124 additional compatibility evidence (2026-11-01): the current lockfile contains exactly two minimatch installations: nested `11.0.3` for `@typescript-eslint/typescript-estree` and root `3.1.5` for legacy ESLint consumers. The root `3.1.5` source was compared with the upstream `11.0.1` security fix: the older implementation does not contain the `optimizationLevel` / `firstPhasePreProcess` / `secondPhasePreProcess` glob-expansion path changed by that fix. The advisory metadata nevertheless declares a blanket affected range of all versions below `11.0.1`. This is useful evidence of a possible over-broad version range, not proof that the package is formally exempt. Do not force a breaking global override or claim the dependency audit is clean; retain ERR-124 until the advisory's applicability is confirmed by the maintainer/security database or an explicit risk exception is approved.


ERR-073 closure reconciliation (2026-11-01): the earlier note that page and parent-document updates remained separate is superseded by the atomic approval and correction RPCs documented above. Do not count ERR-073 as an open code-implementation blocker. The migration application and pgTAP acceptance remain testing-phase work.


## ERR-138 — JSX lint failures in login and privacy pages
- Date: 2026-11-01
- Area: CI / ESLint
- Symptom: The latest pull-request CI run failed ESLint with an unclosed paragraph in `app/login/page.tsx` and two unescaped apostrophes in `app/privacy/page.tsx`.
- Root cause: The login footnote paragraph was missing its closing tag; JSX text contained literal apostrophes that violate the configured `react/no-unescaped-entities` rule.
- Fix: Closed the login footnote paragraph and encoded the two apostrophes as `&apos;` in the privacy notice.
- Verification: The latest foundation CI run on `d74f5d61273c1e1c02fef234dd10cc9ffa630f57` passed ESLint after the complete correction.
- Status: Fixed and verified by ESLint in the latest foundation CI run.

## ERR-139 — Fresh local migration chain lacks the private schema
- Date: 2026-11-01
- Area: Supabase migrations / clean-database bootstrap
- Symptom: The latest isolated database workflow failed while applying `20261101040000_validate_mark_scheme_provenance_and_points.sql` with `schema "private" does not exist`; pgTAP tests were skipped.
- Root cause: The migration creates a trigger function in the `private` schema, but a clean Supabase database created by the workflow has no preceding migration that creates that schema.
- Fix: The failing migration is absent from the connected project's exact migration ledger snapshot, and the local clean-install chain reaches this migration before any private-schema bootstrap. Added an idempotent private-schema creation and revoked schema access from `public`, `anon` and `authenticated` at the start of this migration. This changes only the repository migration source; no hosted migration was applied. The connected schema still requires reconciliation before any deployment.
- Verification: Fresh isolated migration application passed in database run 41301615575; all repository migrations completed before pgTAP execution. No hosted migration was applied.
- Status: Fixed and verified on a fresh isolated database. Connected-project migration reconciliation remains a separate release blocker.


## ERR-140 — Middleware passed response objects instead of header collections
- Date: 2026-11-01
- Area: TypeScript / authentication middleware / response policy preservation
- Symptom: CI type-check failed at two middleware call sites because `copyResponsePolicyHeaders` accepts `Headers`, but callers passed `NextResponse` objects.
- Root cause: The helper's contract was correctly typed for header collections, while middleware call sites did not pass the `.headers` properties.
- Fix: Updated both call sites to pass `source.headers` / `destination.headers` and `previousResponse.headers` / `response.headers`. Added a unit test that verifies allow-listed policy headers are copied without copying `Set-Cookie` or overwriting unrelated destination headers.
- Verification: Latest foundation CI run 41301615500 passed application type-checking and the 132-test Vitest suite; Chromium smoke tests also passed.
- Status: Fixed and verified by type-check and unit tests in the latest foundation CI run.


## ERR-141 — Three pgTAP files contained malformed SQL expression delimiters
- Date: 2026-11-01
- Area: Database authorization and atomic workflow regression tests
- Symptom: The isolated database schema migrations completed, but `supabase test db` failed to parse SQL expressions in `atomic_document_workflows.test.sql`, `question_solution_access.test.sql` and `question_teacher_invite_expiry.test.sql`. The malformed expressions began with `$select` rather than a valid dollar-quote delimiter, so the test runner stopped before executing the remaining assertions in those files.
- Root cause: A previous SQL test edit introduced invalid opening and closing dollar-quote delimiters in seven pgTAP expressions; one of the seven expressions already had a doubled closing delimiter.
- Fix: Replaced all seven malformed openers and the six single-dollar closers with balanced `$$select ... $$` expression bodies. Existing `$test$` and already-valid `$$` expressions were left unchanged.
- Verification: Database run 41301615575 passed all 209 pgTAP assertions across nine SQL test files on a fresh isolated database.
- Status: Fixed and verified by the complete isolated pgTAP suite.


## CI test acceptance — 2026-11-01 (run 41302028456 / commit e34d468)
- Foundation checks: ESLint passed; application TypeScript passed; Playwright configuration and browser-test TypeScript passed; Vitest passed **29 test files / 132 tests**; production build completed successfully.
- Dependency audit: `npm audit --omit=dev` passed with **0 production dependency vulnerabilities**. This does not close ERR-124, which concerns the full development/tooling dependency graph and the minimatch advisory compatibility assessment.
- Database: all repository migrations applied successfully to a fresh isolated local Supabase database; pgTAP passed **9 files / 209 assertions**.
- Browser: Chromium smoke suite passed **7 tests**, with **1 authenticated two-account teacher lifecycle test skipped** because live authentication credentials are not configured in this CI run.
- Secret scanning: passed. Authenticated browser acceptance workflow: skipped; no authenticated live-account test was performed.
- Scope: these are reproducible CI results for the branch commit, not proof of live Google Drive, AI provider, OAuth callback, hosted Supabase migration-history reconciliation, production backup restore, or real-account authentication behavior. No hosted database migration or deployment was performed.
- Result: first complete green foundation + isolated database + unauthenticated browser smoke run. Continue with targeted runtime/provider acceptance and remaining release blockers; do not call production readiness complete.


## ERR-142 — Latest branch-wide automated test baseline passed; authenticated and live-provider acceptance remain gated
- Date: 2026-11-01
- Area: Foundation CI, isolated Supabase migration tests, Chromium browser smoke, release acceptance
- Symptom: Initial test runs exposed JSX lint, middleware typing, missing private-schema bootstrap and malformed pgTAP delimiters (ERR-138 through ERR-141).
- Fix: Corrected those source/test issues and reran the workflows on branch commit `c096fa921e1573566562bcf80d7e314c78a50781`.
- Verification: Foundation workflow `41302672582` passed ESLint, application TypeScript, Playwright config and authenticated-E2E TypeScript checks, 29 Vitest files / 132 tests, and production build. Production-only audit passed with zero vulnerabilities. Database workflow `41302672592` applied the complete repository migration chain to a fresh isolated local Supabase database and passed all 209 pgTAP assertions across nine files. Chromium smoke suite in the same CI run passed 7 tests with 1 skipped. Secret scanning workflow `41302672562` passed. Authenticated browser workflow `41302672560` was skipped because the non-production test-project enablement variable/credentials are not configured.
- Status: Automated branch baseline green. Not production approval: live Google Drive/OAuth, live AI generation and golden-set grading, authenticated two-account behavior, connected Supabase migration-history reconciliation, backup/restore, full dependency advisory resolution, accessibility and performance acceptance remain open.


## ERR-143 — Shared bounded upstream response reader lacked direct regression coverage
- Date: 2026-11-01
- Area: Provider/API response handling and resource bounds
- Symptom: The shared `readLimitedResponseText` helper was used by AI, Brave and Google Drive response paths, but the current test tree had no direct test file for its Content-Length parsing, streamed-byte enforcement or UTF-8 decoding behavior. Earlier roadmap notes incorrectly described this regression coverage as already authored.
- Root cause: The helper implementation was added without a dedicated test module; downstream provider tests covered selected failure paths but did not directly exercise all shared-reader boundaries.
- Fix: Added `tests/read-limited-response.test.ts` covering exact byte limits, absent/malformed/oversized Content-Length, actual streamed overrun, split multibyte UTF-8, invalid UTF-8, empty bodies and invalid configured limits.
- Verification: The corrected suite passed in run `41303192380` on commit `cd835f4b6cbb28929d3a75cd5fa4fafeea7bb9a8`: 30 test files / 152 tests passed. Lint, application/Playwright type-checks and production build also passed.
- Status: Fixed and verified by CI.


## ERR-144 — Content-Length whitespace test assumed raw header bytes survive Fetch normalization
- Date: 2026-11-01
- Area: HTTP response-reader regression tests
- Symptom: The new response-reader tests initially failed two cases expecting leading/trailing whitespace in `Content-Length` to reach application code unchanged.
- Root cause: The Fetch `Headers` implementation normalizes optional HTTP whitespace when the header is inserted, so the test did not represent the value exposed to the application. This was a test-fixture assumption, not evidence that the production reader accepted malformed raw header syntax.
- Fix: Removed the two invalid raw-whitespace rejection cases and added an explicit assertion that the Fetch Headers API normalizes optional whitespace to the decimal value before the bounded reader receives it. Kept rejection cases for empty, signed, negative, fractional, non-decimal and exponent-form values.
- Verification: Full Vitest suite passed after the fixture correction: 30 files / 152 tests passed in run `41303192380` on commit `cd835f4b6cbb28929d3a75cd5fa4fafeea7bb9a8`.
- Status: Fixed; no production defect was established by these two assertions.


## ERR-145 — Regression-suite rerun after bounded-reader test additions
- Date: 2026-11-01
- Area: CI / unit, database and browser smoke testing
- Verification: On commit `cd835f4b6cbb28929d3a75cd5fa4fafeea7bb9a8`, foundation workflow `41303192380` passed lint, application and Playwright TypeScript checks, all 30 Vitest files / 152 tests, and the production build. Database workflow `41303192382` passed all 209 pgTAP assertions across 9 files after applying the full repository migration chain to a fresh isolated local Supabase database. Chromium smoke tests passed 7 tests with 1 skipped in the foundation workflow's browser job. Secret scanning passed in run `41303192377`. The authenticated two-account workflow remained skipped because non-production credentials are not configured.
- Status: Automated branch test baseline green; live authenticated/provider/hosted-database/recovery/accessibility acceptance remains open.


## ERR-146 — Stream cancellation failures could mask response-boundary errors
- Date: 2026-11-01
- Area: Shared bounded upstream response reader
- Symptom: The bounded reader awaited response/reader cancellation before throwing its stable invalid-length or too-large error. If the underlying stream's cancellation algorithm rejected, that cancellation error could replace the intended boundary error.
- Root cause: Cancellation was treated as infallible in the Content-Length and streamed-overrun branches.
- Fix: Made cancellation best-effort in all three rejection branches while preserving the intended `INVALID_RESPONSE_LENGTH` or `RESPONSE_TOO_LARGE` error. Added regression cases where the underlying stream cancellation throws.
- Verification: CI run `41306988899` passed all 155 unit tests across 30 files; the shared bounded-reader regression tests are included in that suite.
- Status: Fixed and verified by CI; live upstream behavior remains separately covered by integration acceptance.

## ERR-147 — Production environment preflight was not wired into foundation CI
- Date: 2026-11-01
- Area: Deployment configuration / CI contract
- Symptom: `scripts/validate-production-env.mjs` and `npm run check:production-env` existed, but the foundation workflow never invoked the validator. Configuration drift could therefore go unnoticed until deployment setup.
- Root cause: The preflight was documented as an operator command but had no automated, credential-free CI contract check.
- Fix: Added a foundation workflow step that invokes the preflight with synthetic non-secret Supabase, Google OAuth, cron, encryption-key and AI-provider values. The step explicitly does not connect to external services and uses no real credentials.
- Verification: Foundation run `41306988899` passed the synthetic environment-contract preflight. This establishes configuration-shape validation only, not provider reachability or correctness.
- Status: Implemented and CI-verified; hosted environment acceptance remains open.



## ERR-148 — Multi-provider fallback had no total request-time budget
- Date: 2026-11-01
- Area: M3 AI provider routing / serverless reliability and cost control
- Symptom: A configured pool may contain up to eight providers, and each request previously had an independent 45-second timeout. With fallback enabled, one user action could therefore occupy a server request for several minutes while sequentially contacting providers.
- Root cause: Per-provider timeouts existed, but the router did not enforce an overall deadline or reduce the timeout for later fallback attempts.
- Fix: Added a 60-second total routing deadline and a maximum 20-second timeout for each provider attempt. The router stops when the shared budget expires; the existing opt-in fallback policy and retryable-error classification remain unchanged. Direct single-provider calls retain their 45-second default timeout.
- Verification: The eight-provider simulated-clock regression test passed as part of the 155-test Vitest suite in foundation run `41306988899`; lint, type-check and production build also passed.
- Status: Implemented and CI-verified; configured-provider runtime acceptance remains open.


## ERR-149 — Keyboard skip-link focus behavior lacked regression coverage
- Date: 2026-11-01
- Area: Accessibility / keyboard navigation
- Symptom: The application already defined a skip link and a shared `:focus-visible` outline for interactive controls, but no browser regression test protected the first keyboard stop, skip-link destination or visible focus treatment.
- Root cause: Existing accessibility styling was not covered by the Chromium smoke suite.
- Fix: Added a Chromium smoke test that tabs to the public-page skip link and verifies that it is focused, points to the main content and has a visible outline. Reused the existing shared focus styling; no duplicate global CSS rule is needed.
- Verification: Chromium smoke run `41306988899` passed the keyboard skip-link/focus regression. This does not replace a complete keyboard, screen-reader or contrast audit.
- Status: Regression verified in CI; full accessibility acceptance remains open.

## ERR-150 — Narrow mobile layout lacked browser regression coverage

- Date: 2026-11-01
- Area: Responsive accessibility / mobile usability
- Symptom: The landing and login pages had responsive CSS, but the Chromium smoke suite did not check for horizontal overflow at a narrow mobile viewport or enforce the intended minimum touch size on login controls.
- Root cause: Responsive styles existed without a browser-level regression assertion for the public entry points.
- Fix: Added a 360px Chromium smoke test for landing/login visibility, document-width overflow and minimum 44px email/password/submit control heights. This reuses the existing mobile CSS and does not claim a full mobile-device or assistive-technology audit.
- Verification: Chromium smoke run `41306988899` passed the 360px viewport overflow and minimum touch-target regression.
- Status: Regression verified in CI; real-device/mobile accessibility acceptance remains open.

## ERR-151 — Connected Supabase schema is behind the document-registration implementation

- Date: 2026-11-01
- Area: Hosted database / migration reconciliation
- Symptom: The connected `academic-assistant` project has a 53-entry migration ledger while the feature branch contains 95 migration files. A read-only schema query found no `register_uploaded_document` function in the public/private schemas, and `public.documents.page_count` still permits every non-negative value.
- Root cause: The connected project's migration ledger and actual schema have not been brought into alignment with the feature branch's later document-worker, atomic-registration and page-count migrations.
- Fix: No hosted change was made. Added fresh schema observations to `docs/MIGRATION_RECONCILIATION.md` and tied the registration/page-count release gates to explicit reconciliation and target approval in `docs/PRODUCTION_READINESS.md`.
- Verification: Read-only Supabase migration listing, catalog query, table metadata and advisors on 2026-11-01. The local isolated CI migration chain and 209 pgTAP assertions pass; this does not establish hosted schema equivalence.
- Status: Open release blocker. Do not deploy the current application against the connected schema or selectively apply recent migrations. Reconcile on an explicitly approved isolated target first.


## ERR-152 — Vercel production build type-check included Playwright-only configuration

- Date: 2026-11-01
- Area: Hosting build / TypeScript project boundaries
- Symptom: The latest inspected Vercel preview build failed during Next.js type validation with "Cannot find module '@playwright/test'" at playwright.auth.config.ts. GitHub CI had hidden the issue by installing Playwright temporarily before its build; Vercel correctly installed only the committed dependency graph.
- Root cause: The root TypeScript include glob covered the authenticated Playwright configuration and E2E test tree, although Playwright is a CI-only temporary dependency and not part of the application build dependencies.
- Fix: Excluded playwright.auth.config.ts and e2e/ from the application tsconfig.json, alongside the already excluded regular Playwright config. Dedicated CI steps continue to type-check both Playwright configurations and the authenticated spec after installing the temporary test runner.
- Verification: The fix is included in commit `4b18ffa75ed1e55a8957472ae5f285f2f8639600`. Subsequent GitHub CI on `b929566a8d175ff1f3894da706ba64414e40ccf2` passed the application build and dedicated Playwright type-checks. A fresh Vercel deployment is still unverified; Vercel previously reported the account's daily deployment limit.
- Status: Code-level fix verified by GitHub CI; hosted Vercel build remains open.


## ERR-153 — Full branch CI rerun after production-readiness and accessibility fixes
- Date: 2026-11-01
- Area: CI / final branch verification
- Symptom: Earlier verification checkpoints did not include the latest provider deadline, response cancellation, environment preflight, keyboard focus and narrow mobile regression coverage.
- Fix: No additional code change was needed for this verification checkpoint; run the complete foundation, isolated database and secret-scan workflows against the current feature head.
- Verification: Commit `b929566a8d175ff1f3894da706ba64414e40ccf2`: foundation run `41306988899` passed ESLint, application and Playwright TypeScript checks, all 155 unit tests across 30 files, synthetic production-environment preflight, production dependency audit and Next.js production build. Chromium smoke tests passed 9 and skipped 1 authenticated two-account test. Database run `41306988908` applied the ordered repository migrations to a fresh isolated local Supabase instance and passed all 209 pgTAP assertions across 9 files. Secret scan run `41306988876` passed. Authenticated two-account acceptance remains skipped; no hosted migration, provider call, backup restore or production deployment was performed.
- Status: Feature-branch automated verification green. Production readiness remains blocked by hosted schema/migration reconciliation, external credentials and runtime acceptance, recovery drill, full dependency advisory remediation, and owner approval.


## ERR-154 — Vercel preview deployment was blocked by account deployment limits
- Date: 2026-11-01
- Area: Hosting / preview verification
- Symptom: Vercel Git integration reported `api-deployments-free-per-day` (more than 100 deployments in the daily window) and a subsequent deployment flood rate limit. A later Vercel bot message also reported that the account can retry after the daily limit resets.
- Root cause: Hosting-account deployment quota/rate limit, not a demonstrated application build failure. The latest feature-branch GitHub Actions production build passes. The repository uses GitHub Actions for its five-minute worker schedule and does not configure a Vercel Cron Job; the Vercel Hobby daily-cron restriction is not a limitation of the committed GitHub workflow.
- Fix: No code change or paid upgrade is appropriate. Stop retrying deployment requests until the provider's rate-limit window resets, then run one preview deployment from the current reviewed feature commit.
- Verification: GitHub Actions build and browser smoke tests passed on `b929566a8d175ff1f3894da706ba64414e40ccf2`; a fresh Vercel deployment has not yet been verified.
- Status: External hosting verification blocker; no plan upgrade or production deployment authorized.


## ERR-155 — Persisted document-processing failures were reported as successful scheduler runs
- Date: 2026-11-01
- Area: Background worker operations / failure visibility
- Symptom: The worker correctly persisted a failed job and returned a JSON payload with `failed: true`, but used HTTP 200. The GitHub Actions scheduler therefore treated an OCR/provider/database processing failure as a successful invocation.
- Root cause: The route conflated successful handling/persistence of a failure with successful document processing.
- Fix: After `fail_document_processing` confirms that the failed state was persisted, the route now returns HTTP 500 with a sanitized error payload. The durable job remains eligible for a later scheduled retry within its attempt budget; no sensitive upstream error is returned.
- Verification: The sanitized HTTP 500 response helper and redaction regression tests passed in Foundation run `41312165056` on commit `443db3ed22bdb3c2086d1ba476b82a33eb870885`; lint, type-check, unit tests, production build and Chromium smoke tests all passed. Live non-production worker acceptance must still confirm that GitHub Actions marks a persisted processing failure as failed and that a later invocation retries within the attempt budget.
- Status: Source fix and automated regressions verified; live worker acceptance remains open.


## ERR-156 — Exhausted failed jobs could starve the document worker queue
- Date: 2026-11-01
- Area: Background worker queue fairness / retry scheduling
- Symptom: The worker selected the oldest queued, failed and stale-running jobs before checking retry eligibility in application code. Ten or more old failed jobs that had already exhausted their retry budgets could occupy the entire candidate page, causing every scheduled invocation to skip them and never reach newer queued or retryable work.
- Root cause: Candidate filtering happened after the database query's fixed limit, so terminal failed jobs consumed the worker's limited candidate slots.
- Fix: Added a service-role-only list_claimable_document_jobs RPC. It filters failed jobs against their per-row attempt_count < max_attempts before applying the limit, while retaining stale running jobs for terminalization and excluding fresh running jobs. The worker now obtains candidates through this RPC.
- Verification: Passed on commit `d0c9ab16bbb0f1f4767448ebc1fd76d039c8589d`: isolated migration/pgTAP run `41314356739` passed all 220 assertions across 10 SQL files; Foundation run `41314356766` passed lint, all TypeScript checks, 176 unit tests across 34 files, production build, and Chromium smoke tests (10 passed, 1 skipped). The new queue regression includes ten older exhausted failed jobs ahead of retryable/queued work, plus stale and fresh running jobs.
- Status: Code-level regression implementation and isolated CI acceptance passed. Live worker scheduling, hosted migration acceptance and deployment remain open.
