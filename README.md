# AI Academic Assistant

A personal, web-based AI academic workspace for a tutor working across Edexcel O Level/A Level, SSC and HSC subjects. It is designed to turn uploaded questions and documents into structured examination answers, Bengali and English teaching explanations, checked working where possible, and reusable chapter knowledge.

> This repository is public by the owner's choice. Never commit credentials, service-role keys, OAuth tokens, student personal data, or private source documents.

## Product principles
- Accuracy and traceability before speed.
- Simple upload-first user experience.
- Permanent user-owned academic knowledge, independent of AI vendors.
- Board-, qualification-, syllabus- and version-aware classification.
- No silent claims of verification: generated, machine-checked and teacher-verified are distinct states.
- Keep infrastructure costs low; never assume AI inference is free.

## Locked decisions
| Area | Decision |
|---|---|
| Users | Personal use; one owner initially |
| Platform | Responsive web app; PWA-ready |
| UI/explanations | Bengali and English |
| Exam answer | English by default |
| AI provider | Automatic task-based routing behind provider adapters |
| Internet | Hybrid: own library/source documents first; web research only when needed |
| Database | Supabase PostgreSQL Free initially |
| File archive | User-authorized Google Drive account |
| Image archive | Convert JPEG/PNG batches into one PDF in selected order; source images are not archived separately |
| Uploaded PDFs | Preserve original PDF; do not reconvert needlessly |
| Architecture | Modular monolith + durable background workers |

## Repository contents
- Responsive dashboard, private sign-in and owner-protected document library.
- Supabase server-client helper and public environment-variable validation.
- Applied profile, document intake, processing job, question and Google Drive connection tables with owner-scoped RLS.
- ESLint and Vitest configuration with initial smoke tests.
- Private Supabase sign-in and protected dashboard.
- Google Drive OAuth with encrypted refresh-token storage and disconnect/revocation; PDF archiving; JPEG/PNG batch-to-PDF conversion; OCR extraction; editable per-page corrections and explicit teacher review.
- A manual, source-linked question library with board, qualification, subject, chapter and topic metadata; search and teacher approval/rejection. AI question classification and solving are not implemented yet.
- Architecture, data model, roadmap, security, authentication, Drive setup, PDF processing and operations documentation.

## Development
1. Install the exact dependency tree with `npm ci`.
2. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
3. Run `npm run dev`.
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before proposing a milestone as complete.

Do not commit `.env.local`, credentials, service-role keys, OAuth tokens, student personal data or private source documents. Database migrations are applied to the dedicated Supabase project and mirrored in `supabase/migrations/`.

## Current status
The latest GitHub Actions run passed dependency installation (`npm ci`), dependency-audit report generation, ESLint, TypeScript, Vitest and the Next.js production build. Supabase profile/document/page/job/question/Drive-connection tables and owner-scoped RLS are applied; composite foreign keys prevent child rows from referencing another owner's document. The private sign-in, Drive OAuth, PDF/image upload, OCR extraction, per-page correction and teacher-review flows are implemented in code. They are not yet live-smoke-tested because the owner's deployment environment and Google OAuth credentials have not been configured. Upload is capped at 4 MB; resumable uploads and automatic background workers are not implemented. OCR output remains unverified until the owner checks it against the original. The AI solver and chapter-intelligence modules remain planned.
