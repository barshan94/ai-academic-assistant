# AI Academic Assistant

A personal, web-based AI academic workspace for a tutor working across Edexcel O Level/A Level, SSC and HSC subjects. It turns uploaded questions and documents into structured examination answers, Bengali and English teaching explanations, verified working where possible, and reusable chapter knowledge.

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

## Quick start
1. Copy `.env.example` to `.env.local`.
2. Fill Supabase project URL and anon/publishable key.
3. Install dependencies with `npm install`.
4. Apply SQL migrations using Supabase CLI or SQL Editor.
5. Run `npm run dev`.

See `docs/` for architecture, data model, Google Drive integration, PDF processing, security, operations, development memory and roadmap.

## Current status
Milestone 1 scaffold and documentation prepared. This is not yet a connected or production-tested deployment. Google Drive OAuth and live Supabase credentials must be configured before integration tests can pass.
