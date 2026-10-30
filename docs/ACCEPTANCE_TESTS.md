# Acceptance Test Plan

## Foundation (M1)
- [ ] Fresh install succeeds from documented steps.
- [ ] Development server starts.
- [ ] Production build succeeds.
- [ ] Typecheck and lint pass.
- [ ] Unauthenticated users cannot access protected routes or owner data.
- [ ] Authenticated owner can sign in and sign out.
- [ ] Database migrations apply on a clean project.
- [ ] RLS tests prove rows are isolated by owner.
- [ ] No secrets are committed to Git.

## Document intake (M2)
- [ ] Accept supported image formats and PDFs; reject invalid signatures and oversized files.
- [ ] Preserve original PDF bytes.
- [ ] Convert multi-image upload into PDF with stable page ordering.
- [ ] Validate rendered PDF readability for mathematical symbols and diagrams.
- [ ] Drive upload retries safely and verifies file metadata.
- [ ] Failed upload retains source data.
- [ ] OCR extracts text and confidence metadata with page references.

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


## Document intake acceptance tests
- [ ] Connect Google Drive using the private owner account; verify a mismatched OAuth state or account is rejected.
- [ ] Upload a valid PDF and confirm the archived Drive file is byte-preserved.
- [ ] Upload a valid JPEG and PNG; confirm each becomes a PDF in Drive.
- [ ] Reject a spoofed MIME type, unsupported signature and file over 4 MB.
- [ ] Upload the same content twice and confirm duplicate detection.
- [ ] Run extraction and confirm page text is saved with `review_required` status.
- [ ] Edit extracted text and confirm the correction is saved as manual extraction.
- [ ] Mark the document reviewed and confirm page/document states update.
- [ ] Confirm a different authenticated owner cannot read or mutate these records.
- [ ] Confirm OCR failures are bounded by three attempts and do not mark the document reviewed.

These external-service checks remain pending until Google OAuth credentials are configured and a real owner account completes the workflow.
