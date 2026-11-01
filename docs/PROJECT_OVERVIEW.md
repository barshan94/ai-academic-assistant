# Project Overview

## Purpose
Build a personal AI academic assistant for Edexcel O Level, Edexcel A Level, SSC and HSC tutoring. It ingests question images and PDFs, extracts editable text, generates exam-style answers and Bengali/English teaching explanations, runs narrow deterministic checks, and accumulates reusable chapter knowledge.

## Subjects
Physics, Mathematics A, Mathematics B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT and Computer Science.

## User and product scope
- One personal owner plus invited teacher accounts with question-specific access.
- No student accounts or public question sharing in the initial release.
- Responsive web application, designed to be PWA-ready.
- Bengali and English teaching explanations; exam-ready answers in English by default.
- Minimal manual configuration, with owner/teacher review for uncertain or high-impact outputs.
- Cloud database and user-owned Google Drive archive.

## Core outputs
1. Structured AI-generated exam answer with working and units where relevant.
2. Separate Bengali and English teaching explanations.
3. Narrow deterministic checks for supported arithmetic, neutral chemistry equations and SI dimensions.
4. Append-only owner/teacher review and correction history.
5. Topic/chapter classification with confidence and source provenance.
6. Reusable concept, formula, short-note and chapter-summary knowledge.

Generated output, machine checks and teacher review remain separate. Passing one narrow check does not prove the full answer correct. Teacher review does not imply official exam-board endorsement.

## Locked architecture decisions
| Area | Decision |
|---|---|
| Platform | Next.js web app, responsive and PWA-ready |
| Database/auth | Supabase PostgreSQL and Auth, Free plan initially |
| Region | Mumbai (ap-south-1) |
| File archive | User-authorized Google Drive |
| Image intake | Convert images into optimized PDF after validation |
| Existing PDFs | Preserve as PDFs; do not needlessly reconvert |
| AI | Provider-neutral OpenAI-compatible server-side adapter pool with task capability routing and owner-defined priority |
| Retrieval | Opt-in approved same-chapter notes first; optional owner-initiated web search when needed |
| Processing | Chunked resumable Drive uploads and one-job-per-invocation background worker implemented; live deployment acceptance pending |
| Users | One owner; invited teachers get access only to explicitly shared questions |
