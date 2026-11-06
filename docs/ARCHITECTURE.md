# System Architecture

## High-level design
Use a modular monolith for the web application and API, with durable background workers for OCR, PDF processing, AI inference and chapter aggregation. Keep AI providers and storage providers behind adapters.

## Main components
1. Next.js + TypeScript UI and server routes.
2. Supabase Auth and PostgreSQL for identity, metadata, academic entities, jobs and audit records.
3. Google Drive API for long-term user-owned file storage.
4. Intake pipeline for validation, image preprocessing, PDF creation, extraction and OCR.
5. Question segmentation and classification against board, qualification, syllabus and topic taxonomy.
6. AI router selecting provider/model by task capability, quality, cost, latency and availability.
7. Solver services for mathematics, physics, ICT and computer science.
8. Verification services using SymPy or equivalent deterministic checks where appropriate.
9. Retrieval and research service that prioritizes the user's library and uses web research only when necessary.
10. Background job orchestration with idempotency, bounded retries, checkpoints and progress.

## Processing flow
Upload -> validate -> preserve temporary source -> optimize/convert if image -> render/readability check -> archive to Drive -> verify Drive metadata -> extract/OCR -> segment -> classify -> solve -> verify -> teacher review -> persist reusable knowledge -> update topic/chapter summaries.

Uploaded PDFs should be preserved as PDFs. Do not re-encode them unless an explicit optimization workflow is justified and validated.

## Reliability and trust
Each stage has durable state and idempotency. Jobs resume from the last successful stage. Large documents are chunked by page/question/topic. Human corrections are versioned. AI output is not automatically verified: use explicit states generated, machine-checked and teacher-verified.
