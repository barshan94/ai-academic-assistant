# Project Memory

Last updated: 2026-11-01

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

## Current progress estimate
The feature branch `feature/m3-ai-solver` now contains substantial M1–M7 application implementation and most M8 hardening code. Do not use the old 25% estimate from the initial M1/M2 baseline. The remaining work is split between implementation refinements and separately deferred acceptance/release gates; no percentage should be called complete until the backlog and acceptance evidence are reconciled.

## Latest implementation checkpoint (2026-11-01)
- Latest work is on `feature/m3-ai-solver`; keep `main` and production untouched.
- Added a bearer-protected readiness probe that validates configuration and performs a bounded server-only Supabase Data API query against `profiles` without returning rows or secret details. The probe does not verify Google Drive or AI provider connectivity.
- Related implementation commit: `42703c118c3135bca1ea78dc0f80cb0abf56cb6d`; roadmap, acceptance plan, README and security notes were updated in subsequent documentation commits.
- Do not start the separate testing/fixing phase until implementation is explicitly reported complete. CI may execute automatically after commits; record its result without treating that as permission to begin the planned test phase.

## Latest implementation checkpoint (2026-11-01, continued)
- Added `.github/workflows/health-monitor.yml`: protected readiness endpoint check every 15 minutes plus manual dispatch, HTTPS-origin validation, bounded curl timeouts, generic response validation, and no response-body/secret logging.
- Added `docs/OPERATIONS_MONITORING.md` with required repository secrets, activation sequence, failure interpretation and explicit scope limitations. Updated M8 roadmap, README and engineering error log (ERR-061).
- Latest commits: `5a58afd` workflow; `393c3a1` error log; `394736c` monitoring runbook; `333a76c` README; `340c17b` roadmap.
- Not active until merged to the default branch and repository secrets `APP_BASE_URL` and `CRON_SECRET` are configured. A green readiness check does not validate Google Drive, AI generation, worker throughput, backups or user workflows.

## Latest implementation checkpoint (2026-11-01, continued)
- Strengthened `app/api/health/ready/route.ts`: readiness now probes `profiles`, `documents` and `processing_jobs` concurrently with bounded server-only HEAD queries. A reachable Supabase API with missing core document-processing tables no longer reports ready. No row data is returned.
- Updated `docs/OPERATIONS_MONITORING.md`, `docs/ROADMAP.md`, `README.md` and added ERR-062 to `docs/ERROR_LOG.md`.
- Latest commits: `56f3b8d` readiness core-table probes; `b46be40` monitor runbook; `9508bb5` roadmap; `220d161` README; `631af23` error log.
- No test commands were run; runtime/migration-absence scenarios remain for the later testing phase.

## Current verified state
- Supabase project is ACTIVE_HEALTHY on the Free plan.
- GitHub repository is public by the owner's choice.
- GitHub Actions run 41035253788 passed npm ci, npm audit (zero vulnerabilities), ESLint, TypeScript type-check, Vitest tests and Next.js production build.
- Locked toolchain includes Node 22, npm 11.21.1, @supabase/ssr 0.12.7, Vitest 4.1.12 and PostCSS 8.5.32 override.
- Supabase migrations applied:
  - 20261030091025 profiles_owner_rls
  - 20261030091056 document_intake_core
  - 20261030091102 fix_question_page_owner_fk
  - 20261030091123 index_document_foreign_keys
  - 20261030091243 google_drive_connections
  - 20261030091909 enforce_document_owner_relationships
  - 20261030093217 least_privilege_application_grants
- RLS is enabled on profiles, documents, document_pages, processing_jobs, questions and drive_connections.
- Composite foreign keys enforce same-owner relationships between documents and their pages, jobs and questions.
- Security advisor reports no security lint findings. Performance advisor reports unused indexes on empty tables; no missing foreign-key indexes remain.
- Current app table grants: anon has no table privileges; authenticated has SELECT/INSERT/UPDATE on profiles and SELECT/INSERT/UPDATE/DELETE on document/page/job/question/Drive tables. TRUNCATE, REFERENCES and TRIGGER are not granted.
- Default privileges are restricted for tables created by the postgres migration role. Supabase's provider-managed supabase_admin defaults were not changed; continue applying application migrations through the postgres migration path and inspect grants for any table created under another role.
- Private email/password sign-in, protected dashboard, server-side user checks and sign-out are implemented. Middleware uses @supabase/ssr 0.12.7, getClaims and forwards auth cache headers.
- Google Drive OAuth uses drive.file scope, owner-bound state cookie, AES-256-GCM encrypted refresh tokens, token refresh and a disconnect/revoke action.
- Upload accepts one PDF or up to 50 JPEG/PNG images with a 4 MB combined limit. Existing PDFs are preserved unchanged; images are combined into one PDF in selection order.
- Supabase stores file metadata and extracted text; source PDFs are archived in the owner's Google Drive.
- Google Drive OCR extraction creates a temporary Google Doc, exports text, then deletes the temporary Doc. Extracted text is editable page-by-page and requires explicit teacher review.
- Document processing has a three-attempt limit and 100-page text cap. A scheduled queue worker, resumable PDF uploads up to 50 MB, 1 MB chunks, encrypted upload-session tokens and server-confirmed resume offsets are implemented on the feature branch; live deployment/OAuth acceptance remains pending. Drive authorization is checked before consuming an upload quota slot.
- Manual question capture is implemented: a teacher can create a question from a reviewed page, add board/qualification/subject/chapter/topic metadata, search the question library and approve/reject records. AI segmentation, classification, answering and verification are not implemented yet.
- Unit tests cover PDF byte preservation, PNG conversion, multi-image PDF page count/order, filename sanitization, extracted-text splitting, refresh-token encryption/tamper rejection and question input validation.
- Live Supabase sign-in, Google OAuth, Drive upload and OCR are NOT yet smoke-tested because owner environment credentials and a live authenticated test session have not been configured.

## Environment requirements (never commit values)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_DRIVE_REDIRECT_URI
- DRIVE_TOKEN_ENCRYPTION_KEY

## Next tasks
1. Configure deployment/local environment and privately create the owner Supabase account; verify sign-in and protected dashboard.
2. Configure Google Cloud OAuth and live-test Drive connect, PDF/image batch upload, OCR, correction, approval and disconnect.
3. Complete non-production acceptance for resumable uploads, interruption recovery and the scheduled background worker.
4. Build AI question segmentation/classification and structured exam-answer generation.
5. Add math/science verification and teacher-correction versioning.
6. Continue syllabus/chapter intelligence, revision and production readiness.


## Latest implementation checkpoint (2026-11-01, continued)
- Fixed upload-quota fairness in `app/api/documents/upload/resumable/start/route.ts`: the owner-scoped Google Drive access token is now acquired before the atomic hourly/daily quota RPC. A disconnected or reauthorization-required Drive account therefore does not consume an upload slot. Quota is still consumed before a remote resumable session is created, preserving admission control.
- Added ERR-063 to `docs/ERROR_LOG.md`; updated `docs/ROADMAP.md` and `README.md` to record the behavior. Corrected stale lower-section project-memory notes that incorrectly said resumable uploads and the worker did not exist.
- Implementation commit: `606e0a3`; documentation commits: `371d5ee`, `1044ebe`, `5c054bb`, `3f2f86e`.
- No test commands or live OAuth/Drive calls were run. Regression and integration verification remain in the later testing phase.

- Follow-up M2 hardening: `app/api/documents/upload/resumable/start/route.ts` now reads metadata requests through a 16 KiB bounded stream, validates declared Content-Length, requires a JSON object and returns client errors for malformed/oversized payloads. Added ERR-064 and updated roadmap/README. Source-only change; no tests run.

- Further resumable-upload client hardening: persisted localStorage entries are validated for token shape/length and exact normalized filename/size before reuse. Reads/writes/removals are best-effort so storage-denied browser contexts do not abort a current upload; invalid entries are discarded. Added ERR-066 and documented the behavior. Commits: `b27d824`, `3ad3617`; no tests run.
