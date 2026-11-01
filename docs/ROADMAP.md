# Development Roadmap

Percentages are cumulative scope estimates, not proof of release readiness.

| Milestone | Scope | Cumulative target |
|---|---|---:|
| M1 | Foundation: scaffold, Supabase, auth, schema/RLS, CI and baseline tests | 10% |
| M2 | Document intelligence: Drive OAuth, PDF/image archive, OCR extraction, correction and teacher review | 25% |
| M3 | AI solver: structured exam answers, bilingual explanations, provider adapters, saved versions | 45% |
| M4 | Verification: deterministic checks, independent teacher review and correction workflows | 58% |
| M5 | Syllabus intelligence: board/qualification/subject/chapter/topic mapping | 68% |
| M6 | Chapter intelligence: cumulative notes, formulas, summaries and provenance | 82% |
| M7 | Exam preparation: topic gaps, question sets, exports and revision workflows | 93% |
| M8 | Production readiness: security, recovery, observability, performance and release | 100% |

## M1 exit criteria
- Application installs and starts locally.
- Supabase environment configuration is documented.
- Authentication and protected routes are implemented.
- Database migrations are mirrored in the repository.
- RLS and least-privilege grants are inspected.
- Lint, typecheck, build and automated tests pass.

## M2 status
Implemented in code: Google Drive OAuth flow, encrypted refresh-token storage, PDF archiving, image-to-PDF conversion, OCR extraction, page-level correction, explicit source review and manual source-linked question capture. Implemented in code: a scheduled queue worker with atomic conditional claims, 15-minute stale-job recovery, per-job bounded retries, one-job-per-invocation processing and protection against deleting page rows referenced by saved questions or chapter notes. Resumable uploads are now implemented in code: PDFs up to 50 MB are normalized in the browser and sent in 1 MB chunks through authenticated server routes. Google Drive calls have bounded timeouts and provider error bodies are not persisted or returned in job diagnostics. Upload admission checks the owner’s Drive authorization before consuming an hourly/daily quota slot; quota is consumed before creating a remote resumable session. The session-start metadata endpoint also enforces a 16 KiB streamed JSON-body limit and rejects malformed/non-object payloads. The browser stores an opaque AES-256-GCM encrypted session token; the server binds it to the owner and file metadata, queries Google's confirmed byte offset after interruptions, and creates the document/job records only after Drive confirms completion. Still required: configure `APP_BASE_URL` and `CRON_SECRET` GitHub Actions secrets plus the deployed worker's Supabase/Google environment variables, run a manual non-production worker invocation, execute real Google OAuth/Drive end-to-end tests including interruption/resume and session expiry, and complete authenticated two-account document isolation acceptance. Atomic page replacement is now implemented through `replace_document_pages`: the user-triggered route and background worker use one transaction, the function checks both question and chapter-note references, and the question-to-page foreign key now prevents cascading question deletion. The migration was generated with the Supabase CLI and passed local migration application. On feature commit `46629f23`, all 71 pgTAP assertions passed, along with lint, type-check, unit tests, production build and Chromium browser smoke tests. Authenticated two-account browser acceptance remains skipped. Scheduler configuration is committed in `.github/workflows/document-worker.yml`; scheduled runs remain unverified until secrets and a deployment exist.

## M3 status — in progress
Implemented on feature/m3-ai-solver:
- Structured exam answer schema and bilingual explanations.
- OpenAI-compatible server-side provider adapter with bounded input/output and HTTPS enforcement.
- Add an optional task-aware pool of up to eight OpenAI-compatible providers, filtered by answer/chapter-note capability and owner-defined priority. Fallback calls are disabled unless explicitly enabled; actual provider/model is retained in answer and note provenance.
- Add opt-in retrieval of up to three owner-approved chapter-note versions from the question's exact confirmed syllabus chapter. The prompt treats notes as secondary untrusted study context; immutable note IDs, versions and titles are stored with the answer and revalidated by a database trigger.
- Add optional owner-initiated Brave web research. Only the manually entered query is sent; HTTPS result leads are stored privately with snippets and publication dates, clearly marked unverified, and protected by five-search/15-minute and 20-search/daily owner quotas.
- Subject/qualification/board/chapter context passed into prompts; missing syllabus context is not guessed.
- Saved answer versions and safe schema validation.
- Owner-opt-in source-page context: one linked page only, explicit checkbox, 8,000-character bound, OCR caveat, and deterministic source provenance stored without retaining the excerpt.
- Arithmetic, supported chemistry atom-count and physics dimensional checks.
- Owner review history and question-scoped teacher invitations/review history.

M3 exit criteria still outstanding:
- Configure a provider key/model securely and test live generation with explicit cost approval.
- An original five-case cross-subject golden-set draft and two-reviewer scoring rubric are documented in `docs/AI_GOLDEN_SET.md`; live runs against the configured model and manual grading remain outstanding.
- Complete independent official-source validation and human grading against current board documents. Structural citation-label validation for AI chapter notes is implemented and covered by unit tests; it only proves that labels refer to supplied source IDs, not that sources support adjacent claims. The code now provides opt-in traceable source-page context and a conservative mark-scheme review workflow that saves owner-supplied HTTPS references, exact page/section locators, optional exam-series/document versions and structured mark points against a specific saved answer. This does not independently verify the publisher, provide certified quotations or perform official mark awarding. New references require a locator in the server schema and a database INSERT trigger; a second database validator enforces HTTPS source hosts, unique point IDs, bounded descriptions/key phrases and valid optional marks even for direct Data API inserts. Legacy rows remain readable with an explicit missing-locator label. The UI displays literal key-phrase presence for human review; it does not award marks, prove semantic equivalence or certify an official scheme. Saved references are append-only and owner-scoped.
- Configure a provider key/model securely and test live generation with explicit cost approval.
- Complete the documented golden-set run and independent human grading.

## M4 status — invitation and teacher-review implementation hardened; acceptance pending

Implemented on `feature/m3-ai-solver` and applied to the Supabase project:
- Question-scoped teacher invitations have a database-enforced seven-day default acceptance window and a 30-day maximum. Existing invitation rows were backfilled from their creation timestamps.
- Invitation creation is an authenticated RPC with a per-owner/question/email transaction lock. It rejects duplicate pending invitations and duplicate active accepted teachers; expired pending or revoked invitations can be re-issued without deleting historical rows.
- Acceptance is an atomic RPC that locks the invitation, checks the current Auth user's confirmed email against the normalized invited address, rejects self-acceptance, and blocks expired, revoked, replayed or mismatched acceptance attempts.
- Expiry applies only to pending invitations. An already accepted teacher retains the question-scoped access until the owner revokes it.
- Revocation is an atomic, one-way RPC. The database generates the timestamp, verifies ownership and active state, and serializes revocation against teacher review. Direct authenticated INSERT/acceptance/revocation writes to invitation state are denied. The invited account retains visibility of the revoked invitation status but loses all question/answer access immediately.
- Question and saved-answer access remains question-scoped through RLS. Teacher review records are append-only; the teacher-review RPC checks the active accepted invitation, and only that workflow can set or remove the `teacher_verified` label. Owner feedback cannot self-promote an answer to teacher-verified. The invitation inbox also retrieves accepted history by immutable Auth user ID, so changing the account email does not hide an accepted/revoked invitation.
- Added pgTAP coverage in `supabase/tests/question_teacher_invite_expiry.test.sql` and extended `supabase/tests/question_solution_access.test.sql` for duplicate/self invitations, confirmed-email matching, unconfirmed-account rejection, acceptance replay, expiry, re-issue, direct-write denial, revocation and review authorization.
- Teacher-account deletion cascades its review events for account-data cleanup; a database trigger recalculates the verification label from surviving teacher reviews so a deleted reviewer cannot leave a stale `teacher_verified` state. Added `supabase/tests/teacher_review_reviewer_deletion.test.sql`. Review-event timestamps are stamped with the database wall clock at insert time so concurrent lock waits cannot reorder the audit history by transaction-start timestamp.
- Supabase security advisor currently reports no security lint findings. The teacher-invite foreign-key index warning was fixed. Remaining performance findings are unused indexes on mostly empty tables and require workload evidence before removal.

M4 acceptance still outstanding:
- Run the pgTAP database suite against the project and resolve any failures.
- Complete two-real-account browser acceptance for invitation creation, confirmed-email acceptance, expiry, re-issue, review, concurrent/repeated revocation and post-revocation access denial.
- Confirm the owner's manual invitation-sharing process is usable; automatic invitation email delivery is intentionally not implemented.
- Independently assess teacher review UI, history visibility and verification-state transitions. A teacher review is human feedback, not official exam-board certification.

## M5 status — in progress
Implemented on feature/m3-ai-solver:
- Store an explicit syllabus specification/version separately from board and qualification.
- Track classification review state independently from question-content review: unreviewed, uncertain or confirmed.
- Validate confidence values in the 0–1 range and prevent incomplete mappings from being marked confirmed.
- Add an owner-only classification editor; invited teachers remain read-only.
- Surface syllabus version and classification state in the question bank.
- Filter the question bank by unreviewed, uncertain and confirmed classification state.
- Add unit coverage for valid, incomplete, uncertain and out-of-range classifications.
- Add owner-scoped, versioned syllabus catalogues with board, qualification, subject, version, effective dates and source provenance.
- Add hierarchical chapter and topic references with uniqueness and same-owner/same-version foreign-key enforcement.
- Link questions to structured catalogue, chapter and topic IDs while retaining text snapshots for backward compatibility.
- Add a private catalogue workspace to create versions, chapters and topics; require an HTTPS source and explicit owner review before marking a version verified.
- Add a versioned JSON import format with strict validation, duplicate detection and an atomic owner-scoped database import; imports remain drafts.
- Restrict catalogue INSERT/UPDATE privileges to the minimum required columns; chapter/topic structure is append-only until dedicated edit workflows exist.
- Prevent a question mapping from being marked confirmed against a draft or retired catalogue.
- Add a dedicated owner-only review queue for unreviewed and uncertain mappings, prioritizing missing/lowest confidence first.
- Make classification chapter/topic selectors dependent on the selected syllabus version and chapter; clear stale child selections when parents change.
- Add deterministic, owner-catalogue-only text-match suggestions for chapters and topics; show matched terms and require explicit owner selection (not calibrated confidence or automatic confirmation).
- Add an append-only database audit trail for question classification creation and changes, including before/after snapshots, owner-only visibility and baseline snapshots for existing questions.
- Record owner-only, append-only HTTPS source citations at chapter/topic level and enforce citation presence at the database layer before structured mappings can be confirmed; citations are not independently certified by the app.
- Add conservative batch review for up to 50 pending mappings, with atomic owner-scoped validation, no-op/stale batch rejection, individual audit snapshots and no bulk-confirm action.
- Add a centrally curated shared syllabus reference schema with separate platform-admin membership, verified-only public reading, draft-only structure editing, append-only chapter/topic evidence and database-enforced publication checks.
- Add a read-only shared reference library and admin-only curator workspace; platform-admin membership is provisioned out of band. Four Cambridge/Pearson Edexcel science catalogues are now seeded as curator-only drafts: Cambridge O Level Physics 5054 (63 topic headings), Cambridge O Level Chemistry 5070 (49), Pearson Edexcel International GCSE Physics 4PH1 (30), and Chemistry 4CH1 (28). They contain 30 chapters, 170 numbered topic headings and 200 chapter/topic evidence locators. They remain unverified and are not visible to ordinary users.

M5 exit criteria still outstanding:
- Populate and maintain the shared reference library with real official-board syllabus versions and citations. The shared schema and curator workflow now exist, and four Cambridge/Pearson Edexcel science shared catalogues have been seeded as curator-only drafts with chapter/topic evidence locators (30 chapters and 170 numbered topic headings total). Separate owner-private JSON imports are also available. Neither shared draft is verified or visible to ordinary users. Detailed learning objectives are not imported; a curator must check every heading against the live official PDF and confirm administrative-zone availability before publication.
- Improve assisted classification with calibrated confidence; current lexical suggestions remain transparent navigation aids, not probabilities. Exact section-code matches receive an explicit reason, and chapter/topic suggestions now display their owner-recorded source evidence before selection. Never silently guess a syllabus version.

### M6 status — implemented in code, independent evaluation and acceptance pending
Implemented on feature/m3-ai-solver:
- Add owner-private, syllabus-chapter-scoped note version records with bounded structured JSON content.
- Add immutable question/document-page source references; source records contain references and locators, not copied OCR text.
- Require at least one source before owner approval; database triggers enforce draft-only creation and immutable note content.
- Restrict updates to status transitions and prevent clients from editing or deleting source history.
- Add same-owner foreign keys, RLS, explicit least-privilege grants and indexes for the new tables.

M6 application status — first usable authoring slice implemented:
- Owner-only chapter workspace lists the owner's syllabus chapters, linked questions and note versions.
- Manual structured note authoring captures summaries, concepts, formulas, worked examples and revision prompts.
- Draft creation and all source references are saved atomically through an authenticated, owner-scoped database function.
- Owners can attach only owner-approved questions classified to the selected chapter and their original document pages; cross-owner or cross-chapter source IDs are rejected. The database RPC independently enforces approved status and exact catalogue/chapter classification, and approval revalidates those question sources in case their review state or classification changed after draft creation. Document-page references are also revalidated at approval: each page must still belong to the owner and be linked to an approved question in the same catalogue/chapter; pgTAP regression coverage now includes valid and wrong-chapter page sources.
- Version history is displayed, revisions can supersede a prior version, and draft approval requires at least one source.
- Reprocessing through either the AI drafting action or manual authoring always creates a new immutable version through the chapter-note draft RPC. Version numbers are allocated under a per-chapter transaction lock, and the optional `supersedes_id` links the new draft to the prior version; approved content is never updated in place. Regression and browser acceptance remain pending.
- Note content and source history remain immutable; approval rechecks that every source is still owner-approved and belongs to the selected chapter. Only status transitions are exposed to clients.

M6 remaining:
- AI drafting is implemented through the configured OpenAI-compatible provider and is now exposed by a chapter-workspace action. It uses up to 12 owner-approved, chapter-classified questions and linked extracted pages, validates structured output, source metadata and supplied citation labels, and saves an unverified owner-review draft. The UI warns that provider usage may incur costs and that output requires review. Live provider execution and source-quality evaluation remain outstanding.
- [x] Require valid supplied-source citations in summaries, concepts, formulas and worked examples; reject fabricated, malformed, truncated, spaced or missing citation labels. `lib/ai/chapter-notes.ts` validates every generated note field against the exact supplied source-label set, and `tests/chapter-notes.test.ts` covers unknown, malformed, lowercase and incomplete citations. This is a structural guard, not proof that a citation actually supports the adjacent claim.
- Conservative formula typography/syntax scan now flags unmatched brackets, incomplete operator edges, adjacent operators and multiple equality signs. It does not evaluate expressions, check units, or establish mathematical correctness; formulas remain unverified pending independent subject review.
- [x] Implement richer source preview and export/print support. AI citation previews include an expandable full extracted-page text view; browser Print / Save as PDF exports the visible chapter-note collection, and each note has a standalone Markdown download containing its content, AI-review warning and source-reference metadata. Pure Markdown export formatting and filename generation have deterministic unit coverage. Automated browser download and print-layout acceptance remains outstanding.
- Add authenticated end-to-end coverage for AI generation, provider-not-configured behavior, owner isolation and approval transitions. Existing two-account teacher invitation/review/revocation acceptance is configured to skip unless a dedicated non-production Supabase environment is supplied.
- [x] Add deterministic unit coverage for chapter-note citation-label integrity and formula-syntax warnings. Database owner-isolation and approval-transition pgTAP coverage is recorded separately; live provider/source-quality evaluation and browser acceptance remain outstanding.

### M7 status — revision tracking, topic insights, practice history and cross-session analytics implemented in code
- Add owner-private confidence tracking for approved questions, with a server-side revision scheduler and a five-level self-reported confidence scale.
- Schedule the next review at 1, 2, 4, 7 or 14 days based on the latest confidence rating; show due, untracked, learning and confident counts.
- Paginate the full approved-question revision queue in 50-question pages with exact total count and deterministic ordering; revision progress is fetched only for the visible page. The four overview counts are explicitly page-scoped.
- Restrict direct table writes and use an authenticated, owner-checked database function; revision data is private and cascades with its question.
- Add topic-level revision insights grouped by the question's subject, chapter and topic metadata; show rated-question counts, low-confidence counts, due counts and average latest confidence.
- Do not classify a topic as weak from unrated questions or a single rating; label groups with insufficient ratings accordingly. Analysis is limited to the latest 1,000 approved questions and excludes questions without chapter/topic metadata.
- Add custom practice set creation using combined subject/chapter/topic filters and a requested set size; the server samples only owner-approved questions and the database function revalidates every selected ID.
- Save immutable question text/metadata snapshots, owner-private set history, and self-marked outcomes (correct, partial, incorrect or skipped) with optional reflection notes. Session completion is derived from all items receiving an outcome; this is not automatic grading.
- Add browser Print / Save as PDF for clean practice sheets; saved question snapshots remain printable even if the source question is later edited or deleted.
- Add cross-session analytics for overall recorded outcomes and subject/chapter/topic patterns, with sample-size safeguards and explicit self-assessment caveats. All saved sets and outcomes are aggregated inside an authenticated owner-scoped database function; the page receives only aggregate totals, eight weekly buckets, the top 100 topic groups and twelve recent sessions. Individual answer rows are not downloaded for analytics.
- Skipped items count toward session completion but are excluded from the correct-rate denominator. A recurring practice signal requires at least three scored attempts and at least half partial/incorrect; it is not presented as an objective weakness or mastery score.
- Add an eight-week longitudinal practice trend using timestamped outcomes, weekly self-marked correct rates, and a comparison only when at least two weeks each contain three scored attempts. Sparse weeks are shown without interpretation; skipped answers are excluded from the rate. Weekly buckets are computed from the full history in the database, not a recent-answer sample.
- Allow a learner to add a completed practice question to the revision queue through a separate, explicit confidence rating. The practice outcome is never converted into confidence automatically; the server resolves the linked question from the authenticated owner's saved practice item and the revision RPC rechecks approval and ownership.
- Add a consolidated study planner that combines due spaced-revision questions with unfinished items from all active practice sessions. Keep both task types distinct, link each to its existing workflow, and use an authenticated owner-scoped database RPC to return exact account-wide totals plus independently paginated pages of 25 due revisions and 25 unfinished practice items. The weekly calendar uses an owner-scoped database RPC for exact week-wide session counts and planned/completed minute totals, while displaying 50 sessions per page with independent pagination.
- Add an owner-private weekly study calendar with Monday–Sunday planning, session titles, date and estimated duration, optional notes, and explicit completion timestamps. Creation and completion use authenticated owner-scoped database functions; estimates are self-entered and are not represented as measured focus time. Calendar data is persisted by a migration committed to the feature branch but is not applied to the live Supabase project.
- Add one-click scheduling actions to due-revision and unfinished-practice queue cards.
- Allow owners to remove a planned calendar block through an authenticated owner-scoped RPC; completed sessions are deliberately retained as history, and direct table writes remain revoked.
- Allow owners to edit the date, title, estimated duration and notes of planned sessions through a validated server action and authenticated owner-scoped RPC; completed sessions remain immutable through this workflow. Each action creates a clearly titled calendar block in the selected week (30 minutes for revision, 45 minutes for practice), preserves the selected week after saving, and links back to the original task workflow; the user remains in control of whether and when a task is scheduled.
- Add previous/next week navigation up to 52 weeks in either direction, constrain the date picker to the selected week, default to that week’s Monday when today is outside it, and preserve the selected week after adding or completing a session.
- Resolve the planner's current date from the browser's IANA timezone (stored in a non-sensitive, one-year device cookie), use UTC-backed date-only arithmetic for Monday–Sunday navigation and formatting, and display completion timestamps in that same timezone. Invalid or missing timezone cookies safely fall back to UTC; no timezone is hardcoded and no database migration is required. Server actions also validate that submitted date-only values are real calendar dates inside the selected week in that timezone; malformed or out-of-week form submissions are rejected before the database RPC.
- The confidence scale and practice outcomes are learner self-assessments, not validated measures of mastery.
- Isolated database authorization coverage for revision, practice, aggregate analytics, the consolidated study queue and weekly calendar passed 37 study-feature pgTAP assertions, including cross-account RPC isolation (CI run `41218501676`, commit `937b52a`).

## M6 status — implemented in code, evaluation pending

- Chapter-note generation uses owner-approved question and source-page inputs, bounded citation checks, source records, append-only versions, approval/archive states and dedicated download/print views.
- The question solver can optionally retrieve up to three latest approved notes from the exact confirmed syllabus chapter. The answer records immutable note IDs, titles and version numbers; the database revalidates ownership, chapter and approval status. Task-aware provider routing, priority ordering and opt-in fallback are implemented; web research stores owner-scoped, HTTPS-filtered source leads from the manually entered query under a daily quota. These are code-complete only; live provider and authenticated acceptance remain pending.
- Remaining: independent source-quality review, live AI note evaluation, PDF/print browser acceptance, and authenticated owner/teacher review.

## M7 status — implemented in code, acceptance pending

- Revision scheduling, practice-set creation, question review history, study planning, progress analytics and owner-scoped study features are implemented in code.
- Database authorization coverage previously passed the 37 study-feature assertions in an earlier isolated run; latest-branch acceptance is not yet complete.
- Remaining: fresh isolated migration/pgTAP acceptance, browser workflow coverage, and cross-account isolation review.

## M8 status — implementation largely in place, operational acceptance pending

- Implemented: nonce-based CSP middleware with dynamic rendering, privacy-safe route/global error boundaries, allow-listed operational failure logs, owner-scoped AI/upload/research quotas, bounded upstream requests/responses, strict Google Drive file-only OAuth scope checks, and keyboard skip/focus/mobile touch-target affordances. GitHub Actions now use immutable action commit SHAs, and the temporary migration-generation workflow with repository write permission has been removed. Added public liveness (`/api/health`) and bearer-protected readiness (`/api/health/ready`) endpoints. Readiness validates the Google OAuth callback URI, canonical Drive-key encoding and both AI task configurations, then performs bounded, parallel server-only, zero-row Supabase Data API probes for the required document, solver, teacher-review, syllabus, chapter-note, revision, practice and weekly-calendar tables without returning academic content. A partial feature migration chain reports not ready; the probe still does not validate every migration, constraint, policy or function. It still does not prove Google Drive or AI provider connectivity.
- Implemented: a local encrypted Supabase logical-export helper (`scripts/backup-supabase.sh`) and archive integrity verifier (`scripts/verify-backup.sh`) that create roles/schema/application-data dumps, a non-secret manifest, SHA-256 checksums and an age-encrypted archive outside the repository. The helper deliberately does not claim to back up Auth identities, Storage objects or external Drive files.
- Implemented this session: `.github/workflows/health-monitor.yml` checks the protected readiness endpoint every 15 minutes and on manual dispatch. It validates HTTPS-origin configuration, uses the existing `APP_BASE_URL` and `CRON_SECRET` repository secrets, rejects non-200/unexpected readiness responses, and fails the workflow without printing the response body or secret. GitHub Actions failure notifications depend on repository/user notification settings; this is not a replacement for a dedicated alerting service. Setup, activation, failure interpretation and explicit monitor limitations are documented in `docs/OPERATIONS_MONITORING.md`.
- Implemented this session: `scripts/validate-production-env.mjs` and `npm run check:production-env` validate the required deployment environment without printing secret values. Added `docs/DEPLOYMENT.md`, `docs/PRODUCTION_READINESS.md` and `docs/INCIDENT_RESPONSE.md`; README now links the operational runbooks. The release checklist explicitly distinguishes code implemented from runtime-tested, connected, deployed and approved capabilities.
- Remaining: full backup/restore proof and supported Auth identity recovery (Supabase Free limitations are documented), dedicated platform log dashboards and log-retention policy, development dependency audit remediation, CSP/auth/browser acceptance, accessibility/performance review and release readiness.
- External setup still required: non-production Google OAuth credentials, worker bearer secret and default-branch schedule, `APP_BASE_URL` and `CRON_SECRET` repository secrets for readiness monitoring, approved AI provider credentials/budget, optional Brave Search key/budget, and isolated two-account test credentials. The new environment preflight has not yet been run against an injected deployment environment. The monitor will not run on its schedule until this workflow is present on the default branch and both repository secrets are configured. Feature-branch migrations have not been applied to the hosted development Supabase project.

## M4 status — implemented in code, independent acceptance pending

- Owner-scoped teacher invitations, expiring/revocable invitation tokens, independent review records, correction notes and append-only verification history are implemented.
- The review RPC validates the teacher's accepted invitation and exact saved answer before recording a decision. The owner can see review history; the invited teacher cannot modify the owner's answer or mark-scheme records.
- Remaining: real two-account acceptance with separate owner/teacher identities, invitation expiry/revocation cases, cross-account RLS and human review of the workflow.

## M4 exit criteria
- Unsupported verification is explicitly marked not checked.
- Independent teacher feedback is tied to authenticated reviewer identity.
- Corrections are retained as append-only events and never silently overwrite AI drafts.
- Authenticated clients cannot self-assign machine-checked or teacher-verified statuses; generated drafts are the only client-insertable state.
- Teacher verification status is only set through an independently authorized workflow.
- Golden-set results are reviewed before release.

## Working rules
- Complete acceptance criteria before calling a milestone done.
- Preserve working features; use separate branches for risky changes.
- Follow the owner's staged workflow: finish implementation, migrations, integration wiring and documentation before deliberately beginning the separate test/fix phase. CI may run automatically after commits; record it without treating it as permission to switch phases.
- Never claim an AI answer is verified unless the relevant check actually ran.
- Keep main and production untouched until explicit merge/release approval.


Upload client hardening (2026-11-01): persisted session tokens are validated against the selected normalized file's exact name and byte size before reuse. Browser storage is best-effort: malformed entries are discarded, and storage-denied contexts can continue the current upload without persistence. Account-switch rejections clear the stale owner-bound token. ERR-065 and ERR-066 track these behaviors; browser acceptance remains in the later testing phase.


Document-processing resource hardening (2026-11-01): the Drive OCR worker now streams and caps the archived PDF download at 50 MB, OCR text export at 10 MB, and conversion metadata at 64 KiB. This closes the previous mismatch where the upload endpoint bounded file size but downstream provider responses were buffered without limits. See ERR-067; runtime acceptance remains pending.


Google integration resource hardening (2026-11-01): OAuth refresh and Drive upload metadata now use a shared 64 KiB streamed JSON reader with strict UTF-8 and object validation. Resumable chunk completion responses are also capped at 64 KiB; 308/404 offset responses are not read. This extends ERR-067's bounded OCR response handling to the remaining Drive metadata/token paths. Source implementation is committed; verification and live Google acceptance remain in the separate test phase (ERR-068).


Upload and OAuth boundary hardening (2026-11-01): the resumable chunk route now validates every decrypted session claim before using it, including expiry, checksum, file bounds, filename and the exact Google Drive upload-session origin/path. Google OAuth authorization-code callback responses now use the shared 64 KiB bounded JSON reader; refresh-token responses and Drive metadata/chunk-completion responses are bounded as well. See ERR-068 through ERR-070. Source implementation is committed; all malformed/oversized-response, invalid-token and live-provider acceptance remains deferred to the separate testing phase.


Google Drive session destination validation (2026-11-01): both issued and decrypted resumable session URLs are now checked through one strict validator requiring HTTPS, the exact Google API hostname, no embedded user-info and a path-segment-bounded Drive files endpoint. Legitimate Drive upload query parameters are preserved. See ERR-071; URL boundary and live upload acceptance remain pending.


Shared AI/research response handling (2026-11-01): the common bounded HTTP reader now rejects malformed Content-Length metadata, enforces the actual streamed byte cap, releases its reader lock on success and failure, and rejects invalid UTF-8 instead of silently replacing bytes. AI and Brave Search integrations consume this helper. See ERR-072; malformed-response regression tests remain in the later testing phase.


Document review action hardening (2026-11-01): manual page correction and document approval now validate UUID inputs, confirm owner-scoped affected rows, and only report success when both page and parent-document updates are confirmed. The two database updates are still separate and require a future transactional RPC migration to eliminate partial-state risk. See ERR-073; all regression testing remains deferred to the dedicated testing phase.


Reference syllabus date validation (2026-11-01): reference-catalog date fields now validate real UTC calendar dates rather than accepting Date.parse normalization of impossible dates. Optional empty dates remain allowed. See ERR-074; boundary and leap-year regression tests remain in the later testing phase.


Google Drive OCR metadata now uses the common 64 KiB bounded JSON parser, enforcing strict UTF-8 and object-shaped JSON before the temporary file ID is accepted. Resumable upload session URL validation is also shared by the transport and chunk route, including rejection of embedded URL credentials. See ERR-071 and ERR-075; provider boundary regression tests remain deferred.


Owner-managed syllabus catalog effective dates now use the same real-calendar-date validation as reference catalogs; impossible dates are rejected and empty optional values remain valid. See ERR-076; regression coverage remains deferred to the testing phase.

Owner-managed syllabus catalogs now also reject an effective end date earlier than the effective start date, matching the cross-field range rule used by syllabus imports. Empty optional boundaries remain supported. See ERR-078; regression coverage remains deferred to the testing phase.

Question review actions now validate UUID identifiers and confirm that an owner-scoped question row was actually updated before reporting success. See ERR-079; regression coverage remains deferred to the testing phase.

Reference syllabus evidence creation now confirms the selected chapter belongs to the selected catalog and any selected topic belongs to that chapter, preventing cross-catalog evidence associations. See ERR-080; regression coverage remains deferred to the testing phase.

Reference syllabus catalogs now enforce chronological effective-date ranges, and JSON syllabus imports reject HTTPS source URLs with embedded credentials. See ERR-081 and ERR-082; regression coverage remains deferred to the testing phase.


Owner and reference syllabus evidence URL validation now rejects embedded URL credentials in addition to requiring HTTPS, preventing deceptive links whose user-info prefix can be mistaken for the destination host. See ERR-077; URL-boundary regression testing remains deferred.

Syllabus catalog lifecycle enforcement (2026-11-01): owner catalog verification is now draft-only, owner evidence insertion is draft-only, and platform reference catalog chapter/topic/evidence creation is draft-only. Verified and retired catalogs can no longer be modified through these actions. See ERR-083 and ERR-084; regression and concurrency testing remains deferred to the separate testing phase.

Reference syllabus verification now requires a valid HTTPS source URL with a hostname and no embedded credentials before a draft catalog can become verified. See ERR-085; URL and lifecycle regression coverage remains deferred to the separate testing phase.

Owner syllabus verification now re-validates the persisted draft catalog source URL (HTTPS, hostname present, no embedded credentials) rather than relying only on non-null source_url. See ERR-086; regression coverage remains deferred to the separate testing phase.

Teacher invitation revocation now confirms that the owner- and question-scoped update actually changed an active invite before reporting success. See ERR-087; missing-row, ownership and repeated-revocation regression coverage remains deferred to the testing phase.

Mark scheme authoring now rejects serialized points JSON above 256 KiB before parsing, in addition to the existing structured field and point-count limits. See ERR-088; malformed and boundary-size regression coverage remains deferred to the testing phase.


Stale document-processing recovery hardening (2026-11-01): after a stale processing job is conditionally marked failed, the route now also confirms that the owner-scoped parent document update actually affected a row before proceeding. This avoids treating a zero-row update as successful recovery and silently leaving job/document state inconsistent. See ERR-089; concurrency and recovery regression coverage remains deferred to the separate testing phase.


Document-processing failure persistence hardening (2026-11-01): the OCR processing catch handler now verifies that both the owner-scoped parent document and active processing-job rows were actually updated before returning the persisted-failure status. A zero-row document update is treated as an unpersisted failure state. See ERR-090; failure-path regression coverage remains deferred to the separate testing phase.


Background document-worker failure persistence hardening (2026-11-01): the cron worker now confirms that the owner-scoped parent document and running processing-job rows both changed to failed before reporting a persisted failure. Missing or concurrently changed parent rows now leave the failure outcome explicitly unpersisted. See ERR-091; worker failure-path regression coverage remains deferred to the testing phase.


Practice answer routing hardening (2026-11-01): answer recording now verifies the owner-scoped relationship between the submitted practice item and practice set before invoking the answer RPC. Redirects and cache invalidation use the set ID returned by the database rather than trusting the submitted route identifier. See ERR-092; regression coverage remains deferred to the testing phase.


Owner syllabus date validation correction (2026-11-01): fixed an over-escaped regular-expression digit pattern that rejected all valid YYYY-MM-DD inputs before calendar-date validation. The UTC round-trip still rejects impossible dates. See ERR-093; regression testing remains deferred to the dedicated testing phase.


Owner syllabus lifecycle correction (2026-11-01): chapter and topic creation now require a draft catalog; verified and retired owner catalogs are locked against taxonomy additions through these actions. See ERR-094. The checks are application-level read-then-write guards only; database-level lifecycle enforcement remains required to prevent concurrent bypass.


Health readiness authorization correction (2026-11-01): corrected an over-escaped whitespace token in the Bearer-header parser. The readiness endpoint can now extract a correctly formatted bearer credential before performing its constant-time secret comparison. See ERR-095; authorization boundary regression tests remain deferred to the dedicated testing phase.


Google Drive OAuth scope alignment (2026-11-01): removed incremental-scope authorization because the application intentionally accepts only the single `drive.file` grant. This keeps the consent request aligned with callback validation and token refresh checks. See ERR-096; live Google consent and reconnect acceptance remain pending.


Web-research quota atomicity (2026-11-01): added a forward-only Supabase migration to serialize quota admission per owner, timestamp the quota window after acquiring the lock, check the daily and 15-minute limits before mutating either counter, and avoid consuming quota on rejected requests. See ERR-097. The migration is committed but intentionally not applied to a database; migration execution, concurrency/boundary tests and Supabase advisor review remain for the dedicated testing and fixing phases.


Document lifecycle transaction hardening (2026-11-01): both the manual processing route and background worker now combine page replacement and processing-job completion in one database transaction through complete_document_processing. The RPC permits the trusted worker role or the authenticated document owner with owner matching. Manual page approval and parent-document readiness now share one transaction through approve_document_review, with owner checks, row locks and page-count validation. Application call sites and database function types are updated. See ERR-098. Migration application and all SQL/RLS/concurrency/rollback verification remain pending the dedicated testing and fixing phases.


Resumable upload transaction hardening (2026-11-01): document creation and initial processing-job creation now use one owner-checked database RPC transaction. Same-owner duplicate-content registration is serialized, and the upload route preserves a potentially committed Drive object when an RPC response is ambiguous rather than deleting a file that a committed row may reference. Database types and the route are updated. See ERR-099. Migration application and SQL/RLS/concurrency/rollback acceptance remain pending the dedicated testing and fixing phases.


Syllabus catalog lifecycle enforcement (2026-11-01): added database triggers across owner and shared-reference chapter, topic and evidence tables. All taxonomy inserts, updates and deletes now require draft catalogs, with parent row locks to serialize against concurrent catalog verification/retirement. Application-level draft checks remain as early feedback; the database is now the authoritative invariant. See ERR-100. Migration application and RLS/concurrency verification remain pending the dedicated testing and fixing phases.


Syllabus lifecycle regression guard (2026-11-01): owner and shared-reference catalog status triggers now prevent verified catalogs from reverting to draft and retired catalogs from being reactivated. Existing draft-to-verified, draft-to-retired and verified-to-retired flows remain permitted. See ERR-101. Database migration application and transition acceptance remain pending the dedicated testing and fixing phases.


Verified syllabus provenance protection (2026-11-01): owner and shared-reference catalog metadata is now immutable after leaving draft, enforced by invoker-security database triggers. Status transitions remain separate and monotonic; verified-to-retired remains permitted without allowing source or syllabus metadata to change. See ERR-102. Database migration application and direct-write acceptance remain pending the dedicated testing and fixing phases.


Document failure-state transaction hardening (2026-11-01): manual and background processing routes now use fail_document_processing to persist the document and job failure states together. The RPC validates owner/service-role authority, locks the running job and restricts stored error messages to an allow-list. See ERR-103. Migration application and failure/rollback/concurrency acceptance remain pending the dedicated testing and fixing phases.


Worker retry-exhaustion recovery (2026-11-01): a stale running job that has exhausted max_attempts is now terminalized atomically with its document instead of remaining stuck in processing. The RPC rechecks the exact observed lease timestamp and the 15-minute staleness threshold under a row lock, so it cannot fail a newer claim. See ERR-104. Database migration application and stale-lease race acceptance remain pending the dedicated testing and fixing phases.


Readiness monitoring hardening (2026-11-01): the 15-minute health monitor now enforces a 10-second readiness response threshold and can send a generic failure alert to an optional HTTPS Slack-compatible webhook. Secret handling avoids logging the webhook URL or response body. Operations documentation records setup and limitations. See ERR-105. Deployment, threshold calibration and webhook delivery remain operational acceptance tasks.


Document upload quota hardening (2026-11-01): Drive upload admission now serializes each owner's quota decision, captures the time after lock acquisition, checks both hourly and daily caps before changing either counter, and increments both only for admitted uploads. Existing limits remain 10/hour and 50/UTC day. See ERR-106. Database migration application and quota boundary/concurrency acceptance remain pending the dedicated testing and fixing phases.


AI generation quota hardening (2026-11-01): solution and chapter-note quota admission now serializes per owner/bucket, timestamps the 15-minute window after lock acquisition, and checks the limit before incrementing. Existing limits remain five solutions or three chapter notes per 15 minutes. See ERR-107. Migration application and quota concurrency/window-boundary acceptance remain pending the dedicated testing and fixing phases.


Document job claim/recovery transaction hardening (2026-11-01): manual and scheduled worker routes now claim the processing job and move the parent document to processing atomically. Manual stale recovery now fails the job and document together, and the database rechecks the exact lease timestamp and 15-minute staleness condition to prevent racing a newer claim. See ERR-108. Migration application and claim/recovery concurrency acceptance remain pending the dedicated testing and fixing phases.




Document correction and manual stale-claim closure (2026-11-01): manual OCR page correction now uses a single owner-authorized database transaction to update the page and return the parent document to `review_required`; corrections are rejected while processing is active. For stale jobs with retry budget remaining, the manual route now invokes the atomic claim RPC directly instead of performing a separate recover-to-failed step followed by a claim. Exhausted stale jobs still transition both document and job to failed atomically. See ERR-109 and ERR-110. Migration application, rollback, row-lock ordering and stale-lease concurrency acceptance remain deferred to the dedicated testing/fixing phases.




Private syllabus lifecycle enforcement (2026-11-01): PostgreSQL now requires private catalogues to be created as drafts; verifies only with an HTTPS source URL, non-empty source title and at least one chapter; stamps source_checked_at using the database clock; prevents owner transfer and source-check timestamp forgery; permits only draft-to-verified/retired and verified-to-retired transitions; and makes retired catalogues immutable. The dashboard no longer supplies its own verification timestamp. See ERR-111. Migration is committed but not applied to a hosted database; lifecycle, privilege and concurrency acceptance remains for the dedicated testing/fixing phases.


Production-readiness documentation and preflight (2026-11-01): added a Node.js environment preflight command, completed the example server environment template with service-role and cron placeholders, and added controlled deployment, release-gate and incident-response runbooks. These are implementation/documentation deliverables only. They do not establish live service connectivity, applied migrations, successful restore, alert delivery, accessibility/performance acceptance or production approval. See ERR-112.


User-facing privacy disclosure (2026-11-01): published `/privacy` and linked it from the landing page. The notice explains current Supabase, Google Drive, optional AI and web-search data flows, cookies, retention and deletion limitations, and explicitly avoids claiming complete backup or production approval. It still requires legal/configuration review, a responsible contact channel and browser accessibility acceptance. See ERR-116.


Public product copy (2026-11-01): refreshed the landing page to describe the implemented document-intake, question-solver, syllabus/chapter-note and exam-preparation workflows as "In code", and to state that external integrations require setup. Removed the obsolete Foundation/M1 status claim. See ERR-117; browser/mobile copy acceptance remains pending.


Private-route indexing controls (2026-11-01): added `app/robots.ts` to disallow dashboard, API and sign-in paths while allowing public landing/privacy pages. Middleware now emits `X-Robots-Tag: noindex, nofollow, noarchive` on private workspace/API/sign-in responses and preserves it on dashboard auth redirects; sign-in metadata is no-index. This is defense-in-depth only and does not replace authentication. See ERR-118; crawler/browser acceptance remains pending.


Accessibility implementation note (2026-11-01): added a forced-colors mode that preserves visible keyboard focus and structural boundaries for major workspace panels and notices when the operating system enables high-contrast colors. This is a source-level affordance only; Windows High Contrast / forced-colors, keyboard, screen-reader and contrast acceptance remain outstanding (ERR-119).


Private-response cache hardening (2026-11-01): middleware now applies `Cache-Control: private, no-store` to dashboard and API paths before authentication checks, so unauthenticated redirects and configuration/error branches inherit the same no-store policy as authenticated workspace responses. See ERR-120; verify headers on successful, redirected and error responses during browser/deployment acceptance.


Middleware response policy now survives Supabase auth-cookie response recreation: the shared header copier retains cache, CSP and crawler directives when a refreshed session causes a new NextResponse to be created (ERR-121). Browser/auth-refresh acceptance remains deferred.
