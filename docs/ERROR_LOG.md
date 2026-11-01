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
