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
- Manual source-linked question library with board, qualification, subject, syllabus version, chapter and topic metadata, owner review states and classification filters.
- Owner-scoped versioned syllabus catalogues with source provenance, hierarchical chapter/topic references and same-owner foreign-key constraints.
- A private syllabus catalogue workspace, atomic versioned JSON import, dependent chapter/topic classification selectors, transparent lexical suggestions with matched-term explanations, source provenance display, append-only before/after classification history, and a prioritized review queue.
- Owner-recorded append-only HTTPS citations at chapter/topic level, with page/section locators and short supporting notes; structured mappings require a citation before owner confirmation, and the UI does not misrepresent citations as independently certified.
- Structured AI answer schema with English exam answer, Bengali/English explanations, working steps, concepts, assumptions and limitations.
- OpenAI-compatible provider adapter with HTTPS enforcement, timeout, bounded question size and strict schema validation.
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

## Current status (30 October 2026)
M1 foundation and core M2 document/question workflows are implemented in code. M3 answer generation, version history and question-scoped teacher review are implemented on the feature branch. M5 now includes owner-scoped versioned syllabus catalogues, source provenance, hierarchical chapter/topic references, question foreign-key links, and owner-only classification review. Existing free-text question metadata remains supported for backward compatibility.

The authenticated two-account browser test is intentionally postponed until final acceptance. Ordinary CI checks continue throughout development. Live AI provider configuration, Google OAuth/Drive workflows, golden-set answer grading, the shared centrally curated syllabus dataset, independently validated official-board source verification and calibrated classification assistance (owner-recorded citations and lexical suggestions are not independently certified), batch classification review, and chapter intelligence remain outstanding. The JSON import format is documented in docs/SYLLABUS_IMPORT.md; imports are owner-private drafts and do not certify official accuracy. Main is unchanged; work remains in draft PR #1.

Estimated implementation progress: approximately 49%. This is a planning estimate, not a release-readiness score.
