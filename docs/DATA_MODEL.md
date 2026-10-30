# Data Model

All user-owned records must include an owner identity (normally auth.users.id) and enforce Row Level Security. The application begins with one owner but must not rely on hidden UI restrictions for security.

## Core tables
- profiles: owner profile and preferences.
- boards: Edexcel, local boards and other supported boards.
- qualifications: O Level, A Level, SSC, HSC and equivalents.
- subjects: Physics, Mathematics A/B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT, Computer Science.
- syllabuses: board/qualification/subject/version metadata.
- chapters and topics: hierarchical syllabus taxonomy.
- documents: original file metadata, Drive file ID, checksum, MIME type, page count and archive status.
- document_pages: extracted page text, OCR metadata and page ordering.
- questions: question text, source document/page, classification and confidence.
- solutions: structured exam-ready answers and version/status.
- explanations: Bengali and English teaching explanations.
- concepts and question_concepts: reusable concepts and mappings.
- chapter_notes: versioned summaries, formulas, short notes and suggestions.
- references: citations and research sources with retrieval timestamps.
- verification_logs: symbolic/numeric/unit/dimensional/code checks and outcomes.
- processing_jobs: stage, status, progress, retries, idempotency key and error details.
- audit_events: security-relevant and important data changes.

## Design rules
Preserve source provenance; use explicit syllabus versions; store confidence and review status separately; keep generated, machine-checked and teacher-verified states distinct; version chapter notes; store Drive file IDs and metadata rather than long-term binary files in Supabase Storage; protect secrets and OAuth tokens.

Use versioned SQL migrations. Test schema changes and RLS policies with authenticated and unauthenticated roles before merging.
