# Acceptance Test Plan

## Foundation (M1)
- [ ] Fresh install succeeds from documented steps.
- [ ] Development server starts.
- [x] Lint, type-check, unit tests and production build passed on the latest fully verified M3 baseline; current feature branch CI is tracked in PR #1.
- [x] Protected routes redirect to login when authentication is not configured (Chromium smoke test).
- [ ] Authenticated owner can sign in and sign out in a live browser test.
- [x] Applied schema migrations are mirrored in timestamped repository files.
- [x] RLS is enabled on current public application tables; owner and question-scoped teacher policies are present.
- [x] Invitation INSERT privileges do not permit setting accepted_by or accepted_at.
- [x] Invitation acceptance is bound to the matching auth JWT email and authenticated user ID.
- [x] Invitation revocation is owner-only and append-only; authenticated clients cannot delete invite history.
- [ ] Full two-account integration test proves cross-account row isolation.
- [ ] No secrets are committed to Git.

## Document intake (M2)
- [x] Reject unsupported file signatures and files over the current 4 MB request limit.
- [x] Preserve existing PDF bytes unchanged in the normalization helper.
- [x] Convert one JPEG/PNG image into a single-page PDF.
- [x] Combine multiple JPEG/PNG images into a PDF with stable selection order.
- [x] Archive PDFs to the connected owner's Google Drive using the drive.file scope.
- [x] Store document metadata, page text, processing jobs and Drive connection state in owner-scoped Supabase tables.
- [x] Use AES-256-GCM encryption for stored Drive refresh tokens; unit tests cover round-trip and tamper rejection.
- [x] Provide editable page-level extracted text and explicit review.
- [ ] Live Google OAuth, PDF upload, image upload, Drive OCR and review workflow tested with the owner's Google account.
- [x] Manually capture an individual question from a reviewed source page with board/qualification/subject/chapter metadata.
- [x] Search the source-linked question library and approve/reject captured questions.
- [ ] Resumable uploads for files larger than 4 MB.
- [x] Implement scheduled server-side document worker with conditional atomic claims, stale-running recovery, per-job retry limits, and one-job-per-invocation processing.
- [ ] Configure worker secrets and scheduler in a non-production deployment; verify wrong-secret rejection, single-job processing, concurrent claim safety, retry exhaustion and stale recovery.
- [ ] Durable background processing worker and automatic retries proven in live integration tests.
- [ ] Cross-account integration test for every document-related table.

## Solver and verification (M3-M4)
- [x] Structured answer schema includes exam answer, working, Bengali and English explanations, concepts, assumptions and limitations.
- [x] AI provider adapter validates structured output and bounds question size/timeouts.
- [x] Saved answer versions are preserved and validated before rendering.
- [x] Arithmetic, supported chemistry atom-count and physics dimensional checks are implemented with explicit limits.
- [x] Owner and invited teacher review records are append-only.
- [x] Teacher access is question-scoped and can be revoked by the owner.
- [x] Authenticated clients cannot INSERT a solution with `machine_checked` or `teacher_verified`; only generated-draft columns are insertable and the database default supplies `generated`.
- [x] Authenticated clients cannot UPDATE solution verification status; future status promotion requires a separately authorized workflow.
- [ ] Live AI provider configured and tested with explicit cost approval.
- [ ] Teacher invitation, acceptance, review and revocation tested against the chosen non-production Supabase project using the authenticated browser workflow (`docs/AUTHENTICATED_E2E_SETUP.md`).
- [ ] Golden-set answer quality manually graded across subjects.
- [x] Owner must explicitly opt in before extracted source-page text is sent to the AI provider; no source text is sent by default.
- [x] Source-page context is limited to the question\u2019s owner-linked page and 8,000 characters; empty/invalid context is rejected and OCR/extraction uncertainty is disclosed.
- [x] Saved answers store deterministic document/page/extraction/hash/length provenance, not the source excerpt itself.
- [ ] Official mark-scheme/source grounding and citation checks.
- [ ] Teacher verification status is only set through an independently authorized workflow.

## Syllabus and chapter intelligence (M5-M6)
- [x] Store board, qualification, subject, syllabus version, chapter and topic separately.
- [x] Keep classification status separate from question-content review status.
- [x] Validate confirmed mappings require board, qualification, subject and syllabus version.
- [x] Validate optional classification confidence is between 0 and 1.
- [x] Owner-only classification editor; teacher accounts remain read-only.
- [x] Classification chapter options depend on the selected syllabus version; topic options depend on the selected chapter and stale child selections are cleared.
- [x] Unit-tested deterministic text matching suggests only labels from the owner's loaded catalogue, displays matched terms/reasons, and never auto-selects or confirms a mapping.
- [x] Classification review displays the selected catalogue's recorded source title, HTTPS source link, owner-checked date and verification status beside text-match suggestions.
- [x] Database trigger writes append-only classification snapshots on question creation and actual classification changes; owner-only history is displayed with before/after summaries.
- [x] Existing questions receive a baseline snapshot without pretending that pre-audit historical changes can be reconstructed.
- [ ] Browser acceptance confirms changing a syllabus version cannot submit a chapter/topic from the previous selection.
- [x] Unit tests cover confirmed, uncertain, unreviewed, incomplete and invalid confidence cases.
- [x] Question bank can filter by unreviewed, uncertain and confirmed classification state.
- [x] Owner-scoped syllabus catalogue stores board, qualification, subject, version, effective dates and source provenance.
- [x] Chapter and topic records are linked hierarchically and constrained to the same owner's catalogue.
- [x] Questions can reference catalogue, chapter and topic IDs while retaining legacy text snapshots.
- [x] Only an owner can read and create catalogue data; RLS blocks cross-account access, anonymous grants and delete grants are absent, and catalogue updates are restricted to verification state/timestamp.
- [x] A catalogue cannot be marked verified without an HTTPS source and verification timestamp.
- [x] A question cannot be confirmed against a draft or retired structured catalogue.
- [x] Versioned JSON import validates the full hierarchy, enforces size/count/duplicate limits and imports atomically as a draft.
- [ ] Authenticated import test proves imported catalogue/chapter/topic ownership and rollback on duplicate or invalid nested data.
- [x] Retired catalogues reject new chapter/topic inserts at the RLS policy layer.
- [ ] Automated database tests prove cross-account catalogue/chapter/topic isolation and reject mismatched reference IDs.
- [x] Dedicated owner-only queue for unreviewed and uncertain mappings, sorted by missing/lowest confidence first.
- [x] Batch review accepts 1–50 unique owner question IDs, rejects malformed/duplicate IDs and never offers bulk confirmation.
- [x] Batch status changes use a SECURITY INVOKER PostgreSQL function that locks and validates the complete owner-scoped batch in one transaction; stale or inaccessible selections roll back entirely. The database trigger records a before/after snapshot for each changed question.
- [x] Stale or inaccessible selections and no-op selections are rejected atomically; every successful batch change produces a real state transition and an audit snapshot. Individual confirmation remains subject to verified catalogue and exact chapter/topic evidence.
- [ ] Shared, centrally curated reference dataset and import pipeline for boards, qualifications, subjects, chapters and topics.
- [x] Record append-only owner citations for individual syllabus chapters and topics, including HTTPS URL, source title, page/section locator and short supporting excerpt.
- [x] Structured mappings cannot be marked confirmed unless the catalogue is verified and a citation exists for the exact selected chapter or topic; database trigger enforces this beyond the UI.
- [x] Source citations are owner-scoped, readable only by their owner, and cannot be edited or deleted by authenticated clients; the UI clearly says citations are not independently certified by the app.
- [ ] Authenticated database tests prove the evidence-required trigger, owner isolation, and append-only grants with two real accounts.
- [ ] Assisted classification with source evidence and calibrated confidence.
- [ ] Chapter notes cite contributing questions and source documents.
- [ ] Reprocessing creates a new note version rather than overwriting teacher-approved content.

## Exam preparation (M7)
- [x] Owner-private confidence tracking for approved questions with explicit 1, 2, 4, 7 and 14 day revision intervals.
- [x] Topic-level revision insights include sample-size safeguards and disclose that confidence is self-reported.
- [x] Practice set generation uses owner-scoped server-side question selection and validates every selected question.
- [x] Practice history stores immutable question snapshots and explicit self-marked outcomes; it does not claim automatic grading.
- [x] Practice analytics aggregate outcomes server-side and exclude skipped answers from scored accuracy.
- [x] The consolidated study queue combines due revisions and unfinished practice items with independent pagination.
- [x] Weekly calendar supports owner-scoped create, edit, complete and planned-session deletion; completed history is retained.
- [x] Calendar date handling uses the browser IANA timezone and validates selected-week boundaries server-side.
- [ ] Database authorization tests pass against a clean local Supabase stack, including cross-account isolation for revision, practice and calendar data.
- [ ] Browser acceptance covers practice creation, outcome recording, insights, revision scheduling and calendar interactions.
- [ ] Authenticated end-to-end acceptance is executed against a dedicated non-production Supabase project.

## Production readiness (M8)
- [ ] Backup and restore process tested.
- [ ] OAuth token handling and revocation tested.
- [ ] Rate limits, retries and job recovery tested.
- [ ] Error reporting excludes secrets and sensitive payloads.
- [ ] Mobile usability and accessibility smoke tests pass.


## Authenticated browser acceptance
- [x] Add a separate Playwright configuration for real Supabase authentication.
- [x] Add a two-account test covering pre-invitation denial, acceptance, teacher correction review, owner visibility and post-revocation denial.
- [x] Add a deterministic answer fixture that does not call an AI provider.
- [x] Add a manual GitHub Actions workflow that uses only a dedicated test Supabase project.
- [ ] Configure test-project credentials as repository Actions secrets and execute the workflow successfully.


## Shared syllabus reference curation
- [x] Shared reference catalogues, chapters, topics, evidence and platform-admin membership are separate from owner-private syllabus catalogues.
- [x] RLS is enabled on every new public-schema table; anon has no table access and authenticated users can read only verified references unless they are appointed platform curators.
- [x] Authenticated users cannot self-promote into platform_admins; membership is managed out of band.
- [x] Curator writes are limited to draft catalogues; chapter/topic structure freezes after publication and source evidence is append-only.
- [x] Database verification requires a checked HTTPS catalogue source and separate source evidence for every chapter and topic.
- [x] Shared reference reader exposes only verified catalogues and their chapter/topic citations.
- [ ] Appoint the first real platform curator and seed a real official-board catalogue after checking the board's current source documents.
- [ ] Test verified-only read access and admin write restrictions with two real authenticated accounts; no test accounts or syllabus rows have been fabricated.

- [ ] Replace or upgrade the legacy ESLint dependency chain so the full development dependency tree can pass `npm audit` without the minimatch v3 compatibility exception. Until then, production dependencies are audited with `npm audit --omit=dev`; the development-toolchain advisory remains documented and is not represented as resolved.
