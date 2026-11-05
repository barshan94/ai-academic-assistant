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
- Free offline chapter-note drafts from up to 12 owner-approved, chapter-classified questions and linked extracted source pages; candidate expressions and question topics retain source references and remain unverified until owner review.
- Browser-only active-recall practice sessions for approved chapter questions, with source-order/shuffled queues and temporary attempted progress; no AI provider or network call is used.
- Deterministic arithmetic, supported neutral chemistry equation atom-count, and SI dimensional-consistency checks. These are narrow checks, not proof of a fully correct answer.
- Saved answer versions and safe schema validation before rendering.
- Append-only owner and teacher review/correction records.
- Question-scoped teacher invitations, email matching, explicit acceptance, restricted read/review access and owner-controlled revocation.
- Supabase RLS policies and least-privilege grants for question sharing and reviews.
- ESLint, TypeScript, Vitest, production build and Chromium smoke tests in GitHub Actions.

## Zero-cost mode

A strict no-AI-provider operating mode is supported: keep `AI_ENABLED=false`, leave AI provider credentials and pools empty, and leave `WEB_SEARCH_PROVIDER`/search credentials unset. Free offline chapter drafts and browser-only practice remain available. See [docs/ZERO_COST_MODE.md](docs/ZERO_COST_MODE.md) for capabilities, limitations and cost controls. Hosting, database and Google Drive usage remain subject to their respective free-tier quotas.

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

M1–M8 application features are substantially implemented on `feature/m3-ai-solver`. The current branch includes the latest authenticated-E2E fixture refactor (commit `4d0e18b4f54b51b0142faf48e67ff9f8c2e6e049`). The immediately preceding baseline commit `dd546e6cb57f331705204f2e154c264bbb1c6b10` passed Foundation checks, database authorization checks and secret scanning. Those baseline checks covered lint, typecheck, unit tests, build, production dependency audit, browser smoke and pgTAP; the new E2E fixture refactor still needs a fresh CI run before it can be called verified. Full dev-inclusive audit continues to report 13 moderate findings in the legacy development toolchain (ERR-124); production-only audit reports zero.

The existing non-production Supabase project `academic-assistant` has now been reconciled and updated with the repository migration chain: 44 pending migrations were applied successfully and the hosted ledger contains 97 entries. The public schema has 31 tables with RLS enabled on all 31, 50 policies across 27 tables, and the expected syllabus seed catalogue (4 catalogues, 30 chapters and 170 topics). No database reset was performed. The 4 internal quota tables intentionally have no direct client policies. Static review of 15 SECURITY DEFINER functions found none executable by anon; 14 remain executable by authenticated and were reviewed for fixed search paths and owner/auth checks. This is not a substitute for full adversarial IDOR testing.

- **M2:** resumable uploads up to 50 MB, upload quotas and a bounded document worker are implemented. Live Google OAuth/Drive, interruption recovery, worker scheduling and external deployment configuration still need acceptance.
- **M3–M4:** structured AI answer generation, saved versions, owner/teacher review history and question-scoped invitations are implemented. Live provider generation with explicit cost approval, a manually graded golden question set and real two-account browser acceptance remain release gates. AI provider calls require explicit `AI_ENABLED=true` and credentials; strict zero-cost mode keeps `AI_ENABLED=false` and uses offline/manual workflows.
- **M5:** four Cambridge/Pearson Edexcel science draft catalogues are seeded for curator review (30 chapters, 170 numbered topic headings). They are not verified or published for ordinary users until a real curator checks them.
- **M6:** chapter-note drafting and versioned review are implemented; live AI evaluation and browser acceptance of downloads/print layout remain.
- **M7:** revision, practice, analytics and study planning are implemented in code; hosted acceptance remains.
- **M8:** encrypted logical-backup creation and archive-integrity verification are implemented, but a full account-and-data restore is not proven. Production preflight, deployment, monitoring and incident-response procedures are committed; production deployment remains unauthorized.

The authenticated two-account browser test no longer requires manually maintained `E2E_QUESTION_ID` or `E2E_SOLUTION_ID` secrets. It creates a uniquely labelled document, page, question and answer using the owner account's publishable-key session, runs the invitation/review/revocation lifecycle, then deletes only those fixture records. The workflow now requires six values: Supabase URL, publishable key, owner email/password and teacher email/password. The workflow remains gated by the repository variable `ENABLE_AUTHENTICATED_E2E=true`; do not enable it until the two accounts are confirmed to be non-production test accounts. Fixture cleanup runs in the test's `finally` block; an interrupted runner may leave clearly labelled E2E fixture records for manual cleanup.

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

## Superseding verification snapshot — 4 November 2026

The earlier dated status notes in this README are historical. The latest feature head `ebf318d96a20de2bfeddf6f4fe0ae9fba6813a7a` has fresh passing GitHub Actions for foundation checks, isolated database migration/authorization tests, authenticated two-account browser acceptance and full-history secret scanning. Foundation validation passed **213 unit tests across 41 files**, Chromium smoke tests, lint, TypeScript checks, production environment preflight, production-only dependency audit and production build.

The previous pgTAP syntax failure was fixed in `ebf318d`; all latest workflow checks now pass. The full development dependency audit still reports 13 moderate transitive minimatch advisory instances in the legacy ESLint graph; production dependencies have zero audit findings. ERR-124 remains open pending compatibility-safe resolution.

Live Google OAuth/Drive acceptance, live AI-provider evaluation with approved credentials/budget, hosted migration reconciliation, full isolated backup/restore proof, accessibility and academic/privacy review remain external release gates. PR #1 remains draft and unmerged. No production deployment is authorized.


## Superseding live verification snapshot — 5 November 2026

Current feature branch head: `34974141075e1c52df8ba22e29cba8dd230bc6f6` (PR #1 remains draft/open).

Latest GitHub Actions for this exact commit:
- Foundation run `41882329396`: lint, application and Playwright type-checks, production environment preflight, production-only dependency audit, build, and **241 unit tests across 44 files** passed.
- Chromium smoke: **10 passed, 2 skipped**.
- Database authorization run `41882329455`: clean local Supabase migration replay and pgTAP authorization suite passed.
- Authenticated two-account acceptance run `41882329427`: **2 passed**, including invitation, teacher review, owner visibility and revocation lifecycle.
- Full-history secret scan run `41882329409`: passed.
- Production dependency audit: **0 findings**. Full development dependency audit: **13 moderate minimatch findings** remain (ERR-124); do not force an incompatible ESLint downgrade.

Latest read-only non-production Supabase inventory (4 November): 101 repository migrations and 101 hosted ledger entries; 98 exact version/name matches and 3 timestamp/name mismatches with SQL verified equivalent. No pending schema DDL was identified after those three history pairs are reconciled. The history-only repair/dry-run workflow has not yet been run; no hosted ledger or schema change is claimed. Supabase Auth leaked-password protection was still disabled at the last inspection. Security/performance advisor findings require review; see `docs/OWNER_ACTIONS.md`.

Vercel: the latest available READY Preview is for application commit `9d8303d30b506c3833c46d1f9ec9c2527b2e9583`. A GitHub comparison confirms the four commits from that deployment to the current head change only workflow/documentation files, not application source. The Vercel check for the current documentation commit reports a build-rate-limit failure, and there is no deployment for the exact current SHA. Production remains on the older `main` version; no production release is authorized.

Still-open release gates: full Google Drive/OAuth upload-resume-OCR-worker acceptance; approved live AI provider/model and golden-set grading; three-pair hosted migration-history reconciliation; full isolated backup/restore drill; ERR-124 remediation; Auth leaked-password protection; manual accessibility/device checks; official syllabus and independent answer review; qualified privacy/legal review; named primary/backup operators; production environment validation and explicit release approval.

A passing CI run is not production approval. Do not merge PR #1 or deploy the feature to Production until the mandatory gates are evidenced and the owner explicitly approves the release.
