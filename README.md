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
- Google Drive OAuth code with encrypted refresh-token storage, PDF archiving, image-to-PDF conversion and OCR correction workflow.
- Scheduled document queue worker with conditional job claiming, 15-minute stale-job recovery, bounded retries, owner-scoped service-role operations and protection for question/chapter-note page references; deployment setup is documented in `docs/BACKGROUND_WORKER.md`.
- Manual source-linked question library with board, qualification, subject, syllabus version, chapter and topic metadata, owner review states and classification filters.
- Owner-scoped versioned syllabus catalogues with source provenance, hierarchical chapter/topic references and same-owner foreign-key constraints.
- A private syllabus catalogue workspace, atomic versioned JSON import, dependent chapter/topic classification selectors, transparent lexical suggestions with matched-term explanations, source provenance display, append-only before/after classification history, and a prioritized review queue.
- Owner-recorded append-only HTTPS citations at chapter/topic level, with page/section locators and short supporting notes; structured mappings require a citation before owner confirmation, and the UI does not misrepresent citations as independently certified.
- Structured AI answer schema with English exam answer, Bengali/English explanations, working steps, concepts, assumptions and limitations.
- OpenAI-compatible provider adapter with HTTPS enforcement, timeout, bounded question size and strict schema validation.
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
5. Before a milestone is considered complete, run npm run lint, npm run typecheck, npm test and npm run build.

Never commit .env.local, service-role keys, OAuth tokens, student personal data or private source documents. Applied Supabase migrations are mirrored in supabase/migrations/.

## Current status (31 October 2026)

M1 foundation, the core M2 document intake flow, M3 structured AI answer generation, M4 deterministic checks and review history, M5 owner-scoped syllabus classification/catalogues, M6 source-linked chapter notes, and M7 revision/practice/study-planning experiences are implemented in code on the feature branch.

Implementation is not the same as release acceptance. The remaining work is tracked in `docs/ROADMAP.md` and `docs/ACCEPTANCE_TESTS.md`:

- **M2:** the scheduled worker is implemented in code but awaits configured non-production secrets, scheduler availability and live integration testing; resumable uploads above 4 MB, live Google OAuth/Drive acceptance and document cross-account tests remain.
- **M3–M4:** live provider generation with explicit cost approval, a manually graded golden question set, stronger source/official mark-scheme grounding, and real two-account teacher acceptance. AI remains disabled until the owner configures provider credentials.
- **M5:** the shared official-board reference library is intentionally empty until a real curator is appointed and current official sources are checked. Lexical suggestions are not calibrated confidence.
- **M6:** live AI chapter-note evaluation, independent source-quality review, dedicated per-note downloads and automated print-layout checks remain.
- **M7:** code and 29 new database authorization assertions are committed; the isolated Supabase migration/pgTAP workflow must pass before acceptance.
- **M8:** backup/restore, operational recovery, security/privacy, accessibility, performance and release acceptance remain.

GitHub Actions runs lint, type-check, unit tests, build, Chromium smoke tests and local Supabase database tests. Authenticated two-account tests remain separately gated by test-only credentials. The existing development Supabase project currently contains the M1–M6 schema; M7 migrations are committed but have not been applied to that project. No production merge or deployment is authorized.
