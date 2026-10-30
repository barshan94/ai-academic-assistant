# Project Overview

## Purpose
Build a personal AI academic assistant for a tutor/coaching centre working across Edexcel O Level, Edexcel A Level, SSC and HSC. The system ingests question images and PDFs, identifies board/qualification/subject/chapter/topic, generates exam-ready answers and bilingual teaching explanations, verifies work where deterministic checks are available, and accumulates reusable chapter knowledge.

## Subjects
Physics, Mathematics A, Mathematics B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT and Computer Science.

## User and product scope
- One personal owner initially; no student accounts or public access in the first release.
- Responsive web application, designed to be PWA-ready.
- Bengali and English teaching explanations; exam-ready answers in English by default.
- Minimal manual configuration: automate OCR, classification, processing, and provider selection while allowing review and correction.
- Cloud database and user-owned Google Drive archive.

## Core outputs
1. Structured exam-ready answer with working, units, diagrams/notation where relevant.
2. Separate detailed teaching explanation in Bengali and English.
3. Topic/chapter classification with confidence and source provenance.
4. Reusable concept, formula, short-note and chapter-summary knowledge.
5. Verification status clearly separated into AI-generated, machine-checked and teacher-verified.

## Locked architecture decisions
| Area | Decision |
|---|---|
| Platform | Next.js web app, responsive and PWA-ready |
| Database/auth | Supabase PostgreSQL and Auth, Free plan initially |
| Region | Mumbai (ap-south-1) |
| File archive | User-authorized Google Drive |
| Image intake | Convert images into optimized PDF after validation |
| Existing PDFs | Preserve as PDFs; do not needlessly reconvert |
| AI | Provider-neutral adapters and task-based model routing |
| Retrieval | Own library first; web research only when needed |
| Processing | Chunked, resumable background jobs |
| Initial users | Personal use, one owner |

## Non-goals for initial release
- Multi-tenant SaaS or public student accounts.
- Guaranteed correctness for every handwritten or diagram-heavy question.
- Automatic deletion of source files before archive and readability validation.
- Dependence on a single AI vendor.
