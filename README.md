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

## Repository status
The initial documentation, architecture notes, database design, project memory, initial Supabase server helpers and profile RLS migration have been committed. This is an incomplete starter scaffold, not yet a runnable or tested application. The dashboard page, remaining setup files, authentication flow and automated tests still need implementation.

## Development
See `docs/` for architecture, data model, Google Drive integration, PDF processing, security, operations, development process and roadmap. Do not apply migrations to production until they have been reviewed and tested.

## Current status
Milestone 1 is in progress. The Supabase project has been provisioned, but the application has not yet been connected to it. No successful application build, automated test run or deployment is being claimed.
