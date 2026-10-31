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
- Arithmetic, supported chemistry atom-count and physics dimensional checks.
- Owner review history and question-scoped teacher invitations/review history.

M3 exit criteria still outstanding:
- Configure a provider key/model securely and test live generation with explicit cost approval.
- Build a golden question set across subjects and manually grade output quality.
- Add citation/source-grounding and mark-scheme comparison workflows.
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
- Add conservative batch review for up to 50 pending mappings, with atomic owner-scoped validation, individual audit snapshots and no bulk-confirm action.
- Add a centrally curated shared syllabus reference schema with separate platform-admin membership, verified-only public reading, draft-only structure editing, append-only chapter/topic evidence and database-enforced publication checks.
- Add a read-only shared reference library and admin-only curator workspace; platform-admin membership is provisioned out of band and no sample curriculum is seeded.

M5 exit criteria still outstanding:
- Populate and maintain the shared reference library with real official-board syllabus versions and citations. The shared schema and curator workflow now exist, but the library is intentionally empty until an appointed curator enters and checks real source material.
- Improve assisted classification with official source evidence and calibrated confidence; current lexical suggestions are only a navigation aid and must not be treated as evidence or probability. Never silently guess a syllabus version.

- Chapter notes cite contributing questions and source documents.
- Reprocessing creates a new note version rather than overwriting teacher-approved content.

## M4 exit criteria
- Unsupported verification is explicitly marked not checked.
- Independent teacher feedback is tied to authenticated reviewer identity.
- Corrections are retained as append-only events and never silently overwrite AI drafts.
- Authenticated clients cannot self-assign machine-checked or teacher-verified statuses; generated drafts are the only client-insertable state.\n- Teacher verification status is only set through an independently authorized workflow.
- Golden-set results are reviewed before release.

## Working rules
- Complete acceptance criteria before calling a milestone done.
- Preserve working features; use separate branches for risky changes.
- Run tests after each meaningful change and report exact outcomes.
- Never claim an AI answer is verified unless the relevant check actually ran.
- Keep main and production untouched until explicit merge/release approval.
