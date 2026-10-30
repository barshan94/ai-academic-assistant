# Project Memory

Last updated: 2026-10-30

## Project
AI Academic Assistant — personal academic workspace for Edexcel O Level/A Level, SSC and HSC.

## Owner's teaching subjects
Physics, Mathematics A, Mathematics B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT and Computer Science.

## Confirmed decisions
- Personal single-owner application initially.
- Responsive web app, PWA-ready.
- Bengali and English explanations; exam-ready answer in English by default.
- Task-based AI provider routing behind provider adapters.
- Hybrid retrieval: own uploaded/library knowledge first; web research only when needed.
- Supabase Free only; no upgrades or charges authorized.
- Supabase organization: Barshan.
- Supabase project: academic-assistant.
- Supabase region: ap-south-1 (Mumbai).
- Supabase project reference: uqpyzicftxxegajaocxi.
- Google Drive is the long-term document archive; Supabase stores metadata and Drive file IDs.
- Images are converted to PDFs; original PDFs are preserved.
- Public GitHub repository is explicitly accepted by owner: https://github.com/barshan94/ai-academic-assistant

## Academic processing rules
- Chunk large documents; never rely on one oversized model context for a whole book/chapter.
- Persist page/question chunks and build topic/chapter summaries hierarchically.
- Keep AI-generated, machine-checked and teacher-verified statuses distinct.
- Preserve source provenance and teacher corrections.
- Use symbolic/numeric/unit/dimensional checks where applicable; do not claim universal verification.

## Planned milestones
M1 10% foundation; M2 25% document intelligence; M3 45% solver; M4 58% verification; M5 68% syllabus intelligence; M6 82% chapter intelligence; M7 93% exam preparation; M8 100% production readiness.

## Current verified state
- Supabase project is ACTIVE_HEALTHY on the Free plan.
- GitHub repository is public by the owner's choice.
- GitHub Actions run 41031067223 passed ESLint, TypeScript type-check, Vitest tests and Next.js production build on commit 1b2dfde (authentication code).
- Supabase migrations applied:
  - 20261030091025 profiles_owner_rls
  - 20261030091056 document_intake_core
  - 20261030091102 fix_question_page_owner_fk
  - 20261030091123 index_document_foreign_keys
  - 20261030091243 google_drive_connections
  - 20261030091909 enforce_document_owner_relationships
  - 20261030093217 least_privilege_application_grants
- RLS is enabled on profiles, documents, document_pages, processing_jobs, questions and drive_connections.
- Supabase security advisors returned no security lint findings. Performance advisor reports only unused indexes on empty tables; no missing foreign-key indexes remain.
- RLS is enabled on all six public application tables. Composite foreign keys enforce same-owner document relationships.
- Authenticated table grants are least-privilege: profiles SELECT/INSERT/UPDATE only; other app tables SELECT/INSERT/UPDATE/DELETE. anon has no table privileges; TRUNCATE, REFERENCES and TRIGGER are not granted. Future public table defaults revoke broad grants.
- Database grants verified across all six tables: anon has no table privileges; authenticated has only required row-level operations.
- Profile policies use auth.uid() owner checks; document, page, job, question and Drive connection tables have owner-scoped RLS policies.
- Supabase stores document metadata and extracted text; original PDFs are archived in the user's Google Drive.
- Email/password sign-in, protected dashboard, server-side user checks and sign-out are implemented.
- Google Drive OAuth uses drive.file scope, owner-bound state cookie and AES-256-GCM encrypted refresh tokens.
- Upload route archives existing PDFs unchanged and converts JPEG/PNG images to PDFs. Current hosted upload limit is 4 MB.
- Google Drive OCR extraction creates a temporary Google Doc, exports text, then deletes the temporary Doc. Page text requires manual correction/review before the document is marked ready.
- Document processing has a three-attempt limit and a 100-page cap; it is manually started from the library (no automatic background worker yet).
- Unit tests cover PDF preservation, image conversion and extracted-text page splitting.
- Live Supabase sign-in, Google OAuth, Drive upload and OCR are NOT yet smoke-tested because owner environment credentials and a live authenticated test session have not been configured.
- Google Drive disconnect/revoke action is implemented. Resumable large-file uploads, automatic background workers, question segmentation, AI solving and syllabus classification remain unfinished.
- Supabase SSR package is 0.12.7; middleware validates JWT claims with getClaims and forwards auth cache headers.
- npm audit found vulnerable Vitest/PostCSS versions; a patch upgrade to Vitest 4.1.12 and PostCSS 8.5.32 is in progress and must be verified before claiming clean dependencies.

## Environment requirements (never commit values)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_DRIVE_REDIRECT_URI
- DRIVE_TOKEN_ENCRYPTION_KEY

## Next tasks
1. Finish CI verification after the document intake implementation and fix all actual failures.
2. Re-run Supabase security/performance advisors and verify RLS grants/policies for every table.
3. Configure Google Cloud OAuth credentials and perform a live Drive connection, PDF/image upload, OCR and review test.
4. Add a safe Drive disconnect/revoke action.
5. Implement resumable uploads above the current 4 MB request cap and a durable worker rather than claiming the queued job is automatic.
6. Build question segmentation, editing and classification.
7. Only then continue to the AI solver and chapter knowledge system.
