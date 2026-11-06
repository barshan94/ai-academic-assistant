# Production launch runbook

This runbook is the release gate for the existing AI Academic Assistant project. It is deliberately fail-closed: a green build or READY Preview is not permission to launch.

## Current operating profile

- Existing Supabase Free project only; do not create a second database.
- Zero-cost mode: `AI_ENABLED=false`, `AI_ALLOW_PROVIDER_FALLBACKS=false`, no AI provider key/model/pool, and no web-search provider/key.
- Existing Google Drive account for archive storage, subject to quota.
- Keep the document worker manual-only until the worker acceptance gates below pass.
- Do not alter hosted migration history or apply Production migrations under the current owner scope.
- Do not merge or deploy Production until the owner explicitly changes that release authorization.

## Gate A — repository and Preview

- [ ] Confirm all required GitHub Actions workflows pass on the exact commit proposed for release: foundation, database authorization/local migration replay, authenticated two-account acceptance, and full-history secret scan.
- [ ] Confirm Vercel Preview is READY for that exact commit.
- [ ] Exercise the actual Preview URL in a browser using owner and teacher test accounts; verify sign-in, sign-out, session refresh, role boundaries, and direct-route authorization.
- [ ] Confirm no secrets, test credentials, synthetic student data, or private source documents are committed.
- [ ] Confirm the privacy page and support/contact destination are present and accurate.

## Gate B — Production configuration (owner-controlled)

The current Production environment was previously observed to have only the public Supabase URL and publishable key among the required app variables. Before a Production release, the owner must configure the following server-only variables in the correct Vercel Production environment:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (cryptographically random, at least 32 bytes)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI` (must exactly match the registered OAuth redirect)
- `DRIVE_TOKEN_ENCRYPTION_KEY` (must decode to exactly 32 bytes)

Do not copy Preview secrets blindly. In particular, changing the Drive token-encryption key can make already stored refresh tokens unreadable. Keep every server-only key out of browser bundles, logs, commits, screenshots, and support messages. Never paste secret values into an issue or chat.

Also verify the public Supabase URL and publishable key, production domain, Supabase Auth site URL and redirect allow-list, Google OAuth consent configuration, and Google Drive API enablement. Use only the existing Supabase project. Do not run a migration as part of environment setup.

## Gate C — Drive and document processing acceptance

Use synthetic, non-personal test PDFs/images only. Record test IDs and outcomes, never token values or private document contents.

- [ ] Upload a valid PDF and verify source bytes and archived Drive bytes have identical SHA-256 and byte count.
- [ ] Convert and upload multiple images; verify page order, resulting PDF integrity, and metadata.
- [ ] Interrupt upload mid-stream, resume from the server-confirmed offset, and verify no missing or duplicated bytes.
- [ ] Simulate an uncertain final response and confirm retry/reconciliation does not create a duplicate or delete the original.
- [ ] Verify expired upload sessions fail safely and can be restarted.
- [ ] Verify cross-account access is denied for upload sessions, documents, extracted pages, and Drive tokens.
- [ ] Verify malformed PDFs, oversized files, unsupported MIME types, and mismatched signatures are rejected.
- [ ] Compare OCR output with the original source, especially mathematical notation, indices, diagrams and Bengali text. Mark uncertain pages for review; never silently promote them as trusted.

## Gate D — worker fault and recovery acceptance

Do not schedule or invoke the Production worker until all of these are tested against a non-production target with synthetic jobs:

- [ ] Correct worker bearer secret succeeds; missing/wrong secret is rejected without leaking details.
- [ ] Two concurrent invocations cannot claim the same job.
- [ ] A stale lease can be reclaimed once and does not duplicate completed work.
- [ ] Transient extraction/provider failures retry within the bounded retry budget.
- [ ] Permanent failures reach a visible terminal/dead-letter state with a safe operator recovery path.
- [ ] A crash between extraction and persistence is recoverable without duplicate pages or orphaned records.
- [ ] A job for one owner cannot access another owner's Drive connection or data.
- [ ] Manual recovery is documented and tested before any recurring schedule is considered.

Keep the worker manual-only until a separate explicit scheduling decision is made. Do not run it against Production as a test.

## Gate E — database and security

- [ ] Review the three known migration filename/version discrepancies against actual SQL content. Do not rewrite the hosted migration ledger to make it look clean.
- [ ] Confirm the deployed schema and repository migration set are equivalent before any future Production migration.
- [ ] Confirm RLS is enabled for every owner-private table and that anonymous/other-owner access is denied.
- [ ] Review all SECURITY DEFINER functions for fixed search_path, explicit auth/ownership checks, and least-privilege grants.
- [ ] Record the accepted mitigation for Supabase Free leaked-password protection being unavailable/disabled. Do not imply the control is enabled.
- [ ] Verify rate limits, upload size/page limits, request timeouts, safe error responses, and quota-exhaustion behavior.
- [ ] Do not claim backup/restore was rehearsed. The separate database rehearsal was explicitly excluded; recovery remains a known limitation.

## Gate F — academic, privacy, accessibility and operations acceptance

These are human acceptance gates and cannot be satisfied by CI:

- [ ] A qualified Cambridge/Edexcel teacher validates syllabus version, chapter/topic mappings, provenance and source references.
- [ ] Independently grade a representative golden set of Physics, Mathematics and Computer Science answers. Include Bengali explanations and English exam-style answers. Record disagreements and correct them.
- [ ] Check OCR and generated content against source material; machine checks are not proof of correctness.
- [ ] Complete privacy/legal review, retention/deletion policy review, third-party data-flow review, and publish a working contact channel.
- [ ] Complete keyboard-only, screen-reader, contrast, zoom/reflow, reduced-motion, Android browser and touch-target checks.
- [ ] Name a primary and backup operator; document incident triage, account revocation, quota exhaustion and user communication.

## Gate G — final release authorization

A release owner must explicitly review and authorize the final commit, Production environment, domain/auth redirect settings, and operational limitations. Until that happens:

- Keep PR #1 open/draft/unmerged.
- Keep the deployment Preview-only.
- Keep AI generation and paid search disabled.
- Keep worker scheduling disabled.
- Do not apply hosted migrations or change Production configuration.
- Do not describe the service as Production-ready.

## Zero-cost launch limitations

With AI and search providers disabled, the product is a private academic document/syllabus/review/practice workspace. It does not provide AI-generated answers or AI tutoring. Free-tier hosting, database and Drive quotas can pause service. Do not promise unlimited availability or automated grading.
