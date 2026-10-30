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
- AI segmentation, classification and solution generation remain later M3 work.

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
