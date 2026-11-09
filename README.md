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
- Bounded document queue worker with conditional job claiming, 15-minute stale-job recovery, bounded retries, owner-scoped service-role operations and protection for question/chapter-note page references. The GitHub Actions workflow is manual-dispatch only; it is not scheduled or proven operational against the live Preview. Setup is documented in `docs/DOCUMENT_WORKER_SETUP.md`.
- Manual source-linked question library with board, qualification, subject, syllabus version, chapter and topic metadata, owner review states and classification filters.
- Owner-scoped versioned syllabus catalogues with source provenance, hierarchical chapter/topic references and same-owner foreign-key constraints.
- A private syllabus catalogue workspace, atomic versioned JSON import, dependent chapter/topic classification selectors, transparent lexical suggestions with matched-term explanations, source provenance display, append-only before/after classification history, and a prioritized review queue.
- Owner-recorded append-only HTTPS citations at chapter/topic level, with page/section locators and short supporting notes; structured mappings require a citation before owner confirmation, and the UI does not misrepresent citations as independently certified.
- Structured AI answer schema with English exam answer, Bengali/English explanations, working steps, concepts, assumptions and limitations.
- Task-aware OpenAI-compatible provider routing with owner-defined priority, opt-in fallback and server-only credentials. Configuration and cost controls are documented in `docs/AI_PROVIDER_SETUP.md`.
- Optional knowledge-first retrieval from up to three approved notes in the question's exact confirmed syllabus chapter, with immutable source-version provenance.
- Optional owner-initiated Brave web research that sends only a manually entered query, stores owner-private HTTPS source leads and never labels search results as verified curriculum evidence. Setup, privacy and cost controls are documented in `docs/WEB_RESEARCH_SETUP.md`.
- Free offline chapter-note drafts from up to 12 owner-approved, chapter-classified questions and linked extracted source pages; candidate expressions and question topics retain source references and remain unverified until owner review.
- Browser-only active-recall practice sessions for approved chapter questions, with source-order/shuffled queues, private temporary working space, self-assessed confidence, progress and local plain-text answer-sheet export; no AI provider or network call is used.
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

## Current status — 9 November 2026

Implementation covers the M1–M8 feature scope, but the project is **not approved for Production**. PR #1 remains open, draft and unmerged.

### Latest verified application checkpoint

- Application/workflow commit `f39a165fd1a200ddd5f8c5dc932c16a50990c119` passed all four required GitHub Actions workflows: [Foundation checks](https://github.com/barshan94/ai-academic-assistant/actions/runs/42635575400) (lint, type checks, unit tests, production build and Chromium smoke), [local Supabase migration/pgTAP authorization](https://github.com/barshan94/ai-academic-assistant/actions/runs/42635575467), [authenticated owner/teacher two-account acceptance](https://github.com/barshan94/ai-academic-assistant/actions/runs/42635575501), and [full-history secret scanning](https://github.com/barshan94/ai-academic-assistant/actions/runs/42635575319).
- The authenticated workflow's undocumented enablement-variable gate and broken feature-push condition were fixed. The two-account acceptance step completed successfully against the approved non-production test project.
- Documentation-only follow-ups now correct the authenticated E2E setup instructions and align the deployment runbook with the current owner restrictions. Each new documentation commit triggers fresh CI; do not transfer the `f39a165` pass to a later head until its own workflows finish.
- PR comparison remains diverged from `main`: 80 commits behind and 2,535 ahead, with 300 changed files at the latest comparison. This is branch history divergence, not a count of unfinished features. GitHub reports the PR is not mergeable; do not blindly merge, rebase or force-push.
- No Production deployment, hosted migration, worker dispatch, merge, paid service activation or second database was performed.

### Current operating constraints

- Keep the existing Supabase Free project and Google Drive account; do not create another database or pay for AI/search/hosting upgrades.
- Keep `AI_ENABLED=false`, AI fallbacks off and provider/search credentials unset unless the owner explicitly changes the zero-cost decision. AI-generated answers and provider-based research are unavailable in this mode.
- Keep the document worker manual-dispatch only. Do not dispatch it or add a schedule until live non-production Drive, worker fault/retry, route, credentials and migration compatibility acceptance are completed and approved.
- Keep PR #1 open, draft and unmerged. Do not deploy Production, change Production environment settings, apply or repair hosted migrations, or alter existing `academic-assistant` and `durga-map` data.
- The separate-database backup/restore rehearsal was skipped by owner instruction. Do not describe it as completed or create a second database.

### Remaining release gates

- Owner-controlled Production server credentials, Google OAuth client and exact redirect configuration.
- Live Google Drive upload integrity, interruption/resume, original-PDF retrieval, cross-account denial and token recovery.
- Worker concurrency, retry, stale-lease and failure-recovery acceptance against a safe non-production target.
- Hosted migration-history/schema parity review; no hosted ledger or schema mutation is authorized.
- A Free-compatible mitigation for the Supabase leaked-password-protection limitation.
- Qualified syllabus verification and independent grading of representative Physics, Mathematics and Computer Science answers. AI remains disabled, so live-model golden-set grading is not available.
- Manual accessibility/device acceptance, privacy/legal review, published support contact and named primary/backup operators.
- Public-repository PDF publication confirmation for `PXL_20261103_115517489~2.pdf`; its contents have not been inspected. Do not delete or rewrite public history without owner confirmation.
- Backup/restore remains unproven; the separate-database rehearsal was skipped by owner instruction.

See `docs/PRODUCTION_READINESS.md`, `docs/PRODUCTION_LAUNCH_RUNBOOK.md` and `docs/OWNER_ACTIONS.md` for detailed release gates and authorization boundaries.

**Release decision: NOT APPROVED FOR PRODUCTION.** Passing CI and non-production browser acceptance do not substitute for the remaining owner-controlled and human acceptance steps.
