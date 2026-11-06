# Development Roadmap

Percentages are planned scope estimates, not completed progress.

| Milestone | Scope | Cumulative target |
|---|---|---:|
| M1 | Foundation: scaffold, Supabase, auth, schema/RLS, CI and baseline tests | 10% |
| M2 | Document intelligence: Drive OAuth, PDF/image archive, OCR extraction, correction and teacher review | 25% |
| M3 | AI solver: structured exam answers, bilingual explanations, provider adapters | 45% |
| M4 | Verification: symbolic/numeric/unit checks and teacher corrections | 58% |
| M5 | Syllabus intelligence: board/qualification/subject/chapter/topic mapping | 68% |
| M6 | Chapter intelligence: cumulative notes, formulas, summaries and provenance | 82% |
| M7 | Exam preparation: topic gaps, question sets, exports and revision workflows | 93% |
| M8 | Production readiness: security, recovery, observability, performance and release | 100% |

## M1 exit criteria
- Application installs and starts locally.
- Supabase environment configuration is documented.
- Authentication works and protected routes reject anonymous access.
- Database migrations apply cleanly and match committed migration files.
- Row Level Security policies and grants are verified for owner isolation.
- Lint, typecheck, build and automated tests pass.

## Early M3 scope
- Capture individual questions from teacher-reviewed document pages.
- Store question text with source page/document provenance and optional board, qualification, subject, chapter and topic metadata.
- Search the owner's question library and approve/reject captured records.
- AI question solving, suggested classification, chapter-note generation and revision-set generation now have an authenticated provider-backed workspace.
- AI outputs are saved with owner-scoped RLS and a teacher review state; outputs are never promoted to verified automatically.
- The current arithmetic scanner checks only explicit one-step numeric equalities. Full symbolic, dimensional, unit, diagram and marking-scheme verification remains open.

## Current implementation snapshot (2026-11-06)
- M3 is partially implemented; live AI provider acceptance is blocked until server-side free-provider credentials/model are configured.
- M4 has a deliberately narrow arithmetic scan, not general mathematical verification.
- Syllabus classification is currently a suggestion and must be checked against official board specifications; automated official-syllabus validation is not complete.
- Chapter notes and revision sets can be generated from approved source questions; integration into versioned chapter-note and practice-set workflows still needs end-to-end acceptance.
- AI output persistence, teacher approval/rejection, per-owner RLS and atomic generation quotas are implemented in the current database.
- Full CI has not yet been confirmed for the latest changes. Do not release based on the earlier green run alone.

## M2 exit criteria
- Google Drive OAuth is configured and live-tested with the owner's account.
- PDFs are archived unchanged; JPEG/PNG inputs become PDFs before archive.
- OCR/extraction creates page-level text and bounded processing jobs.
- The owner can correct extracted text and explicitly mark a document teacher-reviewed.
- Duplicate uploads, failure handling and retry limits are tested.
- Upload size limits and all external-service dependencies are documented.

## Working rules
- Complete one milestone's acceptance criteria before calling it done.
- Preserve working features; use separate experimental branches for risky changes.
- Run tests after each meaningful change and report exact outcomes.
- Never claim an AI answer is verified unless the relevant check actually ran.
- Record decisions and update PROJECT_MEMORY.md after meaningful milestones.
