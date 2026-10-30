# Acceptance Test Plan

## Foundation (M1)
- [ ] Fresh install succeeds from documented steps.
- [ ] Development server starts.
- [x] Lint, type-check, unit tests and production build passed on the latest fully verified M3 baseline; current feature branch CI is tracked in PR #1.
- [x] Protected routes redirect to login when authentication is not configured (Chromium smoke test).
- [ ] Authenticated owner can sign in and sign out in a live browser test.
- [x] Applied schema migrations are mirrored in timestamped repository files.
- [x] RLS is enabled on current public application tables; owner and question-scoped teacher policies are present.
- [x] Invitation INSERT privileges do not permit setting accepted_by or accepted_at.
- [x] Invitation acceptance is bound to the matching auth JWT email and authenticated user ID.
- [x] Invitation revocation is owner-only and append-only; authenticated clients cannot delete invite history.
- [ ] Full two-account integration test proves cross-account row isolation.
- [ ] No secrets are committed to Git.

## Document intake (M2)
- [x] Reject unsupported file signatures and files over the current 4 MB request limit.
- [x] Preserve existing PDF bytes unchanged in the normalization helper.
- [x] Convert one JPEG/PNG image into a single-page PDF.
- [x] Combine multiple JPEG/PNG images into a PDF with stable selection order.
- [x] Archive PDFs to the connected owner's Google Drive using the drive.file scope.
- [x] Store document metadata, page text, processing jobs and Drive connection state in owner-scoped Supabase tables.
- [x] Use AES-256-GCM encryption for stored Drive refresh tokens; unit tests cover round-trip and tamper rejection.
- [x] Provide editable page-level extracted text and explicit review.
- [ ] Live Google OAuth, PDF upload, image upload, Drive OCR and review workflow tested with the owner's Google account.
- [x] Manually capture an individual question from a reviewed source page with board/qualification/subject/chapter metadata.
- [x] Search the source-linked question library and approve/reject captured questions.
- [ ] Resumable uploads for files larger than 4 MB.
- [ ] Durable background processing worker and automatic retries.
- [ ] Cross-account integration test for every document-related table.

## Solver and verification (M3-M4)
- [x] Structured answer schema includes exam answer, working, Bengali and English explanations, concepts, assumptions and limitations.
- [x] AI provider adapter validates structured output and bounds question size/timeouts.
- [x] Saved answer versions are preserved and validated before rendering.
- [x] Arithmetic, supported chemistry atom-count and physics dimensional checks are implemented with explicit limits.
- [x] Owner and invited teacher review records are append-only.
- [x] Teacher access is question-scoped and can be revoked by the owner.
- [ ] Live AI provider configured and tested with explicit cost approval.
- [ ] Teacher invitation, acceptance, review and revocation tested with two real accounts.
- [ ] Golden-set answer quality manually graded across subjects.
- [ ] Official mark-scheme/source grounding and citation checks.
- [ ] Teacher verification status is only set through an independently authorized workflow.

## Syllabus and chapter intelligence (M5-M6)
- [ ] Classification includes board, qualification, subject, syllabus version, chapter and topic.
- [ ] Uncertain classifications are reviewable.
- [ ] Chapter notes cite contributing questions and source documents.
- [ ] Reprocessing creates a new note version rather than overwriting teacher-approved content.

## Production readiness (M8)
- [ ] Backup and restore process tested.
- [ ] OAuth token handling and revocation tested.
- [ ] Rate limits, retries and job recovery tested.
- [ ] Error reporting excludes secrets and sensitive payloads.
- [ ] Mobile usability and accessibility smoke tests pass.
