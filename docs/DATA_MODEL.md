# Data Model

All user-owned records must include an owner identity (normally auth.users.id) and enforce Row Level Security. The application begins with one owner but must not rely on hidden UI restrictions for security.

## Core tables
- profiles: owner profile and preferences.
- drive_connections: owner-scoped encrypted Google Drive refresh token and granted scope.
- boards: Edexcel, local boards and other supported boards.
- qualifications: O Level, A Level, SSC, HSC and equivalents.
- subjects: Physics, Mathematics A/B, Further Pure Mathematics, General Mathematics, Higher Mathematics, ICT, Computer Science.
- syllabuses: board/qualification/subject/version metadata.
- chapters and topics: hierarchical syllabus taxonomy.
- documents: original file metadata, Drive file ID, checksum, MIME type, page count and archive/review status.
- document_pages: extracted page text, OCR method/confidence, review state and page ordering.
- questions: question text, source document/page, classification and confidence.
- question_solutions: structured exam-ready answer versions, actual provider/model, prompt version, verification status, optional source-page hash/length provenance and immutable approved chapter-note references.
- question_solution_mark_schemes: owner-supplied HTTPS references, exact page/section locators, optional document version and structured mark points; append-only and explicitly unverified.
- question_solution_reviews: append-only owner/independent-teacher decisions and correction notes.
- explanations: Bengali and English teaching explanations.
- concepts and question_concepts: reusable concepts and mappings.
- chapter_note_versions and chapter_note_sources: immutable, owner-scoped chapter knowledge versions with source links and explicit approval transitions.
- question_web_research_sources: owner-private append-only HTTPS search result leads with query, provider, snippet, rank and provider-supplied publication date; search results are not verified evidence.
- document_upload_rate_limits and question_web_research_rate_limits: private owner-scoped atomic quota windows.
- ai_generation_rate_limits: owner-scoped AI answer/chapter-note request quotas.
- verification_logs: symbolic/numeric/unit/dimensional/code checks and outcomes.
- processing_jobs: stage, status, progress, bounded retries, idempotency key and generic owner-safe error codes/messages; raw provider exception bodies are not stored.
- audit_events: security-relevant and important data changes.

## Design rules
Preserve source provenance; use explicit syllabus versions; store confidence and review status separately; keep generated, machine-checked and teacher-verified states distinct; version chapter notes; store Drive file IDs and metadata rather than long-term binary files in Supabase Storage; protect secrets and OAuth tokens.

Use versioned SQL migrations. New inserts must validate source ownership, exact syllabus chapter, approved note version and bounded provenance at the database boundary. Run schema/RLS tests with authenticated and unauthenticated roles only in the separately approved testing phase.
