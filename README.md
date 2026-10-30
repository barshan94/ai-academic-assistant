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
| Image archive | Convert images to optimized PDF, validate, then remove temporary source by default |
| Uploaded PDFs | Preserve original PDF; do not reconvert needlessly |
| Architecture | Modular monolith + durable background workers |

## Repository contents
- Responsive foundation dashboard with clearly marked planned modules.
- Supabase server-client helper and public environment-variable validation.
- Initial profile table and owner-scoped RLS migration.
- ESLint and Vitest configuration with initial smoke tests.
- Architecture, data model, roadmap, security, private authentication setup, Google Drive, PDF processing and operations documentation.

## Development
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
3. Run `npm run dev`.
4. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before proposing a milestone as complete.

Do not commit `.env.local`, credentials, service-role keys, OAuth tokens, student personal data or private source documents. Do not apply database migrations until they have been reviewed and tested.

## Current status
Milestone 1 is in progress. The foundation dashboard and project configuration files are committed, but dependency installation, lint, type-check, tests and production build have not yet been verified in this environment. Email/password sign-in, dashboard session checks and sign-out are implemented in code. The Supabase environment variables and owner account still need to be configured; the profile migration has not been applied. The dashboard's four modules are placeholders, not functioning features.
