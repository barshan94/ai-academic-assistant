# Acceptance Test Plan

## Foundation (M1)
- [ ] Fresh install succeeds from documented steps.
- [ ] Development server starts.
- [x] Production build, lint, type-check and automated tests pass in GitHub Actions for the last verified foundation commit.
- [ ] Unauthenticated users cannot access protected routes or owner data in a live browser test.
- [ ] Authenticated owner can sign in and sign out in a live browser test.
- [x] Database migrations are applied and mirrored in timestamped migration files.
- [x] RLS is enabled on all current public application tables; owner policies and anonymous grants have been inspected.
- [ ] Full two-owner integration test proves cross-account row isolation.
- [ ] No secrets are committed to Git.

## Document intake (M2)
- [x] Reject unsupported file signatures and files over the current 4 MB request limit.
- [x] Preserve existing PDF bytes unchanged in the normalization helper.
- [x] Convert one JPEG/PNG image into a single-page PDF.
- [x] Combine multiple JPEG/PNG images into a PDF with stable selection order.
- [x] Archive PDFs to the connected owner's Google Drive using the drive.file scope.
- [x] Store document metadata, page text, processing jobs and Drive connection state in owner-scoped Supabase tables.
- [x] Use AES-256-GCM encryption for stored Drive refresh tokens; unit tests cover round-trip and tamper rejection.
- [x] Use owner-bound OAuth state and same-origin checks for document POST routes.
- [x] Provide editable page-level extracted text and an explicit teacher-review action.
- [x] Provide a Drive disconnect action that attempts token revocation.
- [x] Enforce a three-attempt processing limit and a 100-page text cap.
- [ ] Live Google OAuth, PDF upload, image upload, Drive OCR and review workflow tested with the owner's Google account.
- [ ] Resumable uploads for files larger than 4 MB.
- [ ] Durable background processing worker and automatic retries.
- [ ] Verify mathematical symbols, tables and diagrams against the original before approval.
- [ ] Cross-account integration test for every document-related table.

## Solver and verification (M3-M4)
- [ ] Each question receives structured exam answer and separate Bengali/English explanation.
- [ ] Mathematical notation, units and significant figures are preserved.
- [ ] Symbolic/numeric/unit checks are recorded when applicable.
- [ ] Unsupported verification is explicitly marked not checked.
- [ ] Teacher corrections are retained and versioned.
- [ ] Golden-set results are reviewed before release.

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
