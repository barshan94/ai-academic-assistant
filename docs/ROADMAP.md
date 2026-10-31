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
Implemented in code: Google Drive OAuth flow, encrypted refresh-token storage, PDF archiving, image-to-PDF conversion, OCR extraction, page-level correction, explicit source review and manual source-linked question capture. Still required: real Google OAuth/Drive end-to-end testing, durable background processing, resumable large uploads and cross-account isolation tests.

## M3 status — in progress
Implemented on feature/m3-ai-solver:
- Structured exam answer schema and bilingual explanations.
- OpenAI-compatible server-side provider adapter with bounded input/output and HTTPS enforcement.
- Subject/qualification/board/chapter context passed into prompts; missing syllabus context is not guessed.
- Saved answer versions and safe schema validation.
- Owner-opt-in source-page context: one linked page only, explicit checkbox, 8,000-character bound, OCR caveat, and deterministic source provenance stored without retaining the excerpt.
- Arithmetic, supported chemistry atom-count and physics dimensional checks.
- Owner review history and question-scoped teacher invitations/review history.

M3 exit criteria still outstanding:
- Configure a provider key/model securely and test live generation with explicit cost approval.
- Build a golden question set across subjects and manually grade output quality.
- Complete citation/source-grounding checks and mark-scheme comparison workflows. Current source-page context is opt-in and traceable, but does not yet provide verified quotations or official mark-scheme matching.
- Test teacher invitation, acceptance, review and revocation using two real accounts.
- Add automated database authorization tests for cross-account isolation.

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
- Add a read-only shared reference library and admin-only curator workspace; platform-admin membership is provisioned out of band and no sample curriculum is seeded.

M5 exit criteria still outstanding:
- Populate and maintain the shared reference library with real official-board syllabus versions and citations. The shared schema and curator workflow now exist, but the library is intentionally empty until an appointed curator enters and checks real source material.
- Improve assisted classification with official source evidence and calibrated confidence; current lexical suggestions are only a navigation aid and must not be treated as evidence or probability. Never silently guess a syllabus version.

### M6 status — foundation started
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
- Owners can attach only owner-approved questions classified to the selected chapter and their original document pages; cross-owner or cross-chapter source IDs are rejected.
- Version history is displayed, revisions can supersede a prior version, and draft approval requires at least one source.
- Note content and source history remain immutable; approval rechecks that every source is still owner-approved and belongs to the selected chapter. Only status transitions are exposed to clients.

M6 remaining:
- AI drafting is implemented through the configured OpenAI-compatible provider. It uses up to 12 owner-approved, chapter-classified questions and linked extracted pages, validates structured output, source metadata and supplied citation labels, and saves an unverified owner-review draft. Live provider execution and source-quality evaluation remain outstanding.
- Require valid supplied-source citations in summaries, concepts, formulas and worked examples; reject fabricated, malformed or missing citation labels in those factual sections. This is a structural guard, not proof that a citation actually supports the adjacent claim.
- Conservative formula typography/syntax scan now flags unmatched brackets, incomplete operator edges, adjacent operators and multiple equality signs. It does not evaluate expressions, check units, or establish mathematical correctness; formulas remain unverified pending independent subject review.
- Add richer source preview and export/print support. AI citation previews include an expandable full extracted-page text view; a print stylesheet and browser Print / Save as PDF action now export the visible chapter-note collection, including expanded source text. Dedicated per-note downloads and automated print-layout checks remain outstanding.
- Add authenticated end-to-end coverage for AI generation, provider-not-configured behavior, owner isolation and approval transitions. Existing two-account teacher invitation/review/revocation acceptance is configured to skip unless a dedicated non-production Supabase environment is supplied.
- Add automated owner-isolation and approval-transition tests.

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
- Add one-click scheduling actions to due-revision and unfinished-practice queue cards. Each action creates a clearly titled calendar block in the selected week (30 minutes for revision, 45 minutes for practice), preserves the selected week after saving, and links back to the original task workflow; the user remains in control of whether and when a task is scheduled.
- Add previous/next week navigation up to 52 weeks in either direction, constrain the date picker to the selected week, default to that week’s Monday when today is outside it, and preserve the selected week after adding or completing a session.
- Resolve the planner's current date from the browser's IANA timezone (stored in a non-sensitive, one-year device cookie), use UTC-backed date-only arithmetic for Monday–Sunday navigation and formatting, and display completion timestamps in that same timezone. Invalid or missing timezone cookies safely fall back to UTC; no timezone is hardcoded and no database migration is required. Server actions also validate that submitted date-only values are real calendar dates inside the selected week in that timezone; malformed or out-of-week form submissions are rejected before the database RPC.
- The confidence scale and practice outcomes are learner self-assessments, not validated measures of mastery.

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
- Run tests after each meaningful change and report exact outcomes.
- Never claim an AI answer is verified unless the relevant check actually ran.
- Keep main and production untouched until explicit merge/release approval.
