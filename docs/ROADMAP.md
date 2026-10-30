# Development Roadmap

Percentages are planned scope estimates, not completed progress.

| Milestone | Scope | Cumulative target |
|---|---|---:|
| M1 | Foundation: scaffold, Supabase, auth, schema/RLS, CI and baseline tests | 10% |
| M2 | Document intelligence: Drive OAuth, image-to-PDF, extraction, OCR and review | 25% |
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
- Database migrations apply cleanly.
- Row Level Security tests prove owner isolation.
- Lint, typecheck, build and automated tests pass.

## Working rules
- Complete one milestone's acceptance criteria before calling it done.
- Preserve working features; use separate experimental branches for risky changes.
- Run tests after each meaningful change and report exact outcomes.
- Never claim an AI answer is verified unless the relevant check actually ran.
- Record decisions and update PROJECT_MEMORY.md after meaningful milestones.
