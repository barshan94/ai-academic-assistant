# AI Academic Assistant

A personal academic workspace for Edexcel O/A Level, SSC and HSC tutoring. It accepts question images and PDFs, extracts editable question text, generates structured exam-style answer drafts with Bengali and English teaching explanations, and records deterministic checks and teacher feedback.

> This repository is public by the owner's choice. Never commit credentials, service-role keys, OAuth tokens, student personal data, or private source documents.

## Product principles
- Accuracy and traceability before speed.
- Board-, qualification-, syllabus- and version-aware classification.
- Knowledge-first retrieval; web research only when needed.
- Bengali and English teaching explanations; exam answers in English by default.
- Generated, machine-checked, owner-reviewed and independently teacher-reviewed are distinct states.
- Keep infrastructure costs low; never assume AI inference is free.

## Architecture and locked decisions
| Area | Decision |
|---|---|
| Platform | Responsive Next.js web app; PWA-ready |
| Database/auth | Supabase PostgreSQL and Auth, Free plan initially |
| Region | Mumbai (ap-south-1) |
| File archive | User-authorized Google Drive |
| AI | Provider-neutral OpenAI-compatible adapter; provider/model configured server-side |
| Retrieval | Own library first; web research when needed |
| Initial users | One owner plus question-scoped invited teacher accounts; no student accounts |
| Processing | Modular monolith with a path to durable background workers |

## Implemented
- Private sign-in and owner-protected document library.
- Google Drive OAuth code with encrypted refresh-token storage, PDF archiving, browser-side image-to-PDF conversion and OCR correction workflow. Resumable 1 MB chunk uploads support PDFs up to 50 MB, encrypted upload-session tokens and server-confirmed resume offsets.
- Scheduled document queue worker with conditional job claiming, 15-minute stale-job recovery, bounded retries, owner-scoped service-role operations and protection for question/chapter-note page references; deployment setup is documented in `docs/DOCUMENT_WORKER_SETUP.md`.
- Manual source-linked question library with board, qualification, subject, syllabus version, chapter and topic metadata, owner review states and classification filters.
- Owner-scoped versioned syllabus catalogues with source provenance, hierarchical chapter/topic references and same-owner foreign-key constraints.
- A private syllabus catalogue workspace, atomic versioned JSON import, dependent chapter/topic classification selectors, transparent lexical suggestions with matched-term explanations, source provenance display, append-only before/after classification history, and a prioritized review queue.
- Owner-recorded append-only HTTPS citations at chapter/topic level, with page/section locators and short supporting notes; structured mappings require a citation before owner confirmation, and the UI does not misrepresent citations as independently certified.
- Structured AI answer schema with English exam answer, Bengali/English explanations, working steps, concepts, assumptions and limitations.
- Task-aware OpenAI-compatible provider routing with owner-defined priority, opt-in fallback and server-only credentials. Configuration and cost controls are documented in `docs/AI_PROVIDER_SETUP.md`.
- Optional knowledge-first retrieval from up to three approved notes in the question's exact confirmed syllabus chapter, with immutable source-version provenance.
- Optional owner-initiated Brave web research that sends only a manually entered query, stores owner-private HTTPS source leads and never labels search results as verified curriculum evidence. Setup, privacy and cost controls are documented in `docs/WEB_RESEARCH_SETUP.md`.
- AI chapter-note drafting from up to 12 owner-approved, chapter-classified questions and linked extracted source pages; generated notes retain source-reference metadata, validate citation labels, and remain unverified drafts requiring owner review.
- Deterministic arithmetic, supported neutral chemistry equation atom-count, and SI dimensional-consistency checks. These are narrow checks, not proof of a fully correct answer.
- Saved answer versions and safe schema validation before rendering.
- Append-only owner and teacher review/correction records.
- Question-scoped teacher invitations, email matching, explicit acceptance, restricted read/review access and owner-controlled revocation.
- Supabase RLS policies and least-privilege grants for question sharing and reviews.
- ESLint, TypeScript, Vitest, production build and Chromium smoke tests in GitHub Actions.

## Teacher review limits
- The invited teacher must already have an account using the exact invited email address.
- The invitation appears in the teacher's /dashboard/teacher-invites page; the app does not currently send invitation emails.
- Teachers can read the shared question and saved answer drafts and submit append-only review feedback.
- Teachers cannot edit the question or generate AI answers.
- Revoking an invitation removes access; invitation/revocation records are retained.
- A teacher review is not an official exam-board mark scheme and does not automatically change an answer to teacher_verified.
- See docs/TEACHER_REVIEW.md.

## Development
1. Install dependencies: npm ci.
2. Copy .env.example to .env.local.
3. Configure Supabase URL and publishable key for local auth/database access.
4. Run npm run dev.
5. For a production-like environment, inject the server variables and run `npm run check:production-env`; the check does not contact external services.
6. Complete the implementation phase first when requested; run npm run lint, npm run typecheck, npm test and npm run build only during the separately approved testing phase.

Never commit .env.local, service-role keys, OAuth tokens, student personal data or private source documents. Applied Supabase migrations are mirrored in supabase/migrations/.

## Privacy

- User-facing data handling notice: `/privacy`.
- Engineering security and privacy controls: `docs/SECURITY_AND_PRIVACY.md`.

## Operations and release documentation

- Controlled deployment: `docs/DEPLOYMENT.md`.
- Production release gate and explicit blockers: `docs/PRODUCTION_READINESS.md`.
- Monitoring setup and limitations: `docs/OPERATIONS_MONITORING.md`.
- Incident response: `docs/INCIDENT_RESPONSE.md`.
- Backup scope and recovery limitations: `docs/BACKUP_RESTORE.md`.
- Database/API security review: `docs/SECURITY_BOUNDARY_AUDIT.md`.
- Exact repository-versus-connected-project migration ledger comparison: `docs/MIGRATION_RECONCILIATION.md`.

## Current status (3 November 2026)

M1–M7 application features are substantially implemented in code on `feature/m3-ai-solver`. Current branch head `5d63d32a56aa7c1a717cdcef4023d3c8580ee46a` passed Foundation checks (`41596518661`), isolated database authorization (`41596518471`) and secret scanning (`41596518490`). Foundation includes lint, application/Playwright type-checks, production environment contract validation, production dependency audit and production build. The latest application-code commit `086c19c21b20187758330dbbd5053b05cf1535eb` passed 207 unit tests across 40 files. Chromium smoke on the current head passed 10 tests and skipped one authenticated two-account test; the separate authenticated workflow (`41596518526`) was also skipped because test credentials are not configured. The isolated database suite passed 236 pgTAP assertions across 11 SQL files. CI run IDs and scope are recorded in `docs/PRODUCTION_READINESS.md`.

Implementation is not the same as release acceptance. Production is not approved: the hosted Supabase migration chain remains unreconciled/unapplied, external services are not connected/accepted, backup recovery is incomplete, and security, accessibility and performance acceptance remain pending. The remaining work is tracked in `docs/ROADMAP.md`, `docs/ACCEPTANCE_TESTS.md` and `docs/PRODUCTION_READINESS.md`.

- **M2:** resumable uploads up to 50 MB, upload quotas of 10 new sessions/hour and 50/day per owner, and a one-job-per-invocation worker are implemented in code. Live Google OAuth/Drive, resumable interruption recovery, worker scheduling, deployment secrets and two-account isolation still require non-production acceptance.
- **M3–M4:** live provider generation with explicit cost approval, a manually graded golden question set, independent source/mark-scheme review, and real two-account teacher acceptance remain. Mark-scheme references are owner-supplied evidence, not certified official schemes. AI remains disabled until the owner configures provider credentials.
- **M5:** four Cambridge/Pearson Edexcel science draft catalogues are seeded for curator review (30 chapters, 170 numbered topic headings, 200 source-evidence locators). They are not verified or visible to ordinary users until a real curator checks and publishes them. Lexical suggestions are not calibrated confidence.
- **M6:** live AI chapter-note evaluation, independent source-quality review, and browser acceptance of downloads/print layout remain.
- **M7:** revision, practice, analytics and study planning are implemented in code. Isolated database authorization coverage is included in the latest full migration replay; live hosted acceptance remains pending.
- **M8:** local encrypted logical-backup creation and archive integrity verification are implemented, but a full account-and-data restore is not proven. Production preflight, deployment, monitoring and incident-response procedures are committed. Public liveness and bearer-protected readiness endpoints are implemented, but the hosted schema is currently behind the repository migration chain and readiness is not a substitute for migration or integration acceptance.

The latest read-only hosted inventory records 97 repository migrations, 53 hosted ledger entries and 44 pending migrations after the two exact-SQL version-history repairs. The owner has authorized the version-aware reconciliation and migration execution on the existing non-production `academic-assistant` project. Execution still requires the pinned Supabase CLI session to run the guarded ledger repairs, full `--include-all --dry-run` and ordered migration push; the connected database interface cannot perform that CLI workflow. No hosted migration has been applied during this verification.

No merge to `main`, production deployment, additional Supabase project creation or production migration is authorized.

Resumable-upload browser state is validated against the selected file and treated as best-effort: malformed or cross-account sessions are discarded, and a current upload can proceed when browser storage is unavailable. Reload-based resume still depends on browser storage being available.


The document worker also enforces streamed response-size limits when downloading PDFs from Drive (50 MB), receiving OCR text (10 MB), and parsing OCR conversion metadata (64 KiB); this protects worker memory independently of the original upload checks.


## Outstanding release acceptance gates

The following procedures are committed, but their human/external acceptance steps are deliberately not marked complete:

- [Isolated backup and restore drill](docs/ISOLATED_BACKUP_RESTORE_DRILL.md): the encrypted logical-backup helper and archive-integrity verifier exist; a real isolated restore, original-password sign-in and original Drive-token encryption-key recovery still require execution.
- [ERR-124 minimatch remediation](docs/ERR-124_MINIMATCH_REMEDIATION.md): the lockfile still contains a legacy minimatch 3.x dependency path. Do not force v11 into legacy consumers; complete the reviewed compatible migration/patch and audit.
- [Accessibility acceptance](docs/ACCESSIBILITY_ACCEPTANCE.md): automated smoke checks do not replace screen-reader, contrast, zoom/reflow and real-device acceptance.
- [Academic, privacy and operations acceptance](docs/ACADEMIC_PRIVACY_OPERATIONS_ACCEPTANCE.md): official syllabus validation, independent human grading, qualified privacy/legal review and named primary/backup operators remain required.

A procedure or checklist is not evidence of a successful drill, review or approval. Keep each gate open until its evidence is recorded against the tested commit.
