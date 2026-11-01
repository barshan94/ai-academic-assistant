# Production readiness and release gate

## Current decision

> **Status: NOT APPROVED FOR PRODUCTION**

The application has substantial feature and security implementation, but production readiness is not established. This document is the single release gate checklist. A checkbox is complete only when the named evidence exists; source code or documentation alone does not satisfy a runtime acceptance item.

The owner selected infrastructure constraint remains Supabase Free only. No paid upgrade, production migration, merge to `main`, or hosted deployment is authorized by this document. Actions requiring provider credentials, legal decisions, account provisioning or an assigned human operator are listed in [OWNER_ACTIONS.md](./OWNER_ACTIONS.md).

## Release principles

- Preserve the implementation → testing → fixing sequence. This checklist defines scope; it does not authorize starting tests early.
- Use a disposable non-production Supabase project and dedicated Google OAuth client for all integration and recovery work.
- Keep production secrets out of source, browser bundles, logs, GitHub issues and test environments.
- Never label AI output, syllabus mappings, mark-scheme sources or OCR as verified unless the corresponding human/technical verification actually occurred.
- Prefer a reviewed forward database migration to a speculative rollback.
- Do not exceed the approved free-tier and external-provider budgets. AI and web search can incur charges.

## 1. Application and release artifact

- [ ] Freeze the implementation scope and publish a reviewed release candidate commit.
- [ ] Complete lint, typecheck, unit/integration tests and production build during the authorized testing phase.
- [ ] Complete Chromium smoke and mobile responsive/accessibility acceptance.
- [ ] Confirm all user-facing pages, sign-in/out, protected routes, empty/error/loading states and navigation.
- [ ] Verify print and Markdown exports on supported desktop and mobile browsers.
- [ ] Confirm dynamic rendering and nonce-based CSP do not break hydration, Supabase cookie refresh, Google OAuth redirects or configured AI provider connections.
- [ ] Confirm deployment uses Node.js 22 and the Node.js runtime for routes that require cryptography, PDF processing or streaming.
- [ ] Confirm no test fixtures, credentials, private source files or student data are present in the release artifact.

## 2. Environment and deployment

- [x] Add a production environment preflight command that validates required variables and key URL/format invariants without printing secret values.
- [x] Add missing server-only service-role and cron placeholders to `.env.example`.
- [ ] Run `npm run check:production-env` using the isolated deployment's injected environment.
- [ ] Configure Supabase URL/publishable key and server-only service-role key in the hosting provider.
- [ ] Configure Google OAuth client, exact HTTPS callback URL, `drive.file` scope and stable 32-byte Drive encryption key.
- [ ] Configure AI provider credentials for both answer and chapter-note tasks only after explicit provider, privacy and cost approval.
- [ ] Configure GitHub Actions `APP_BASE_URL` and `CRON_SECRET` secrets; optional webhook is HTTPS-only.
- [ ] Configure the worker and readiness workflows on the default branch after the isolated deployment is accepted.
- [ ] Verify public sign-ups remain disabled and the initial owner account is provisioned privately.
- [ ] Verify platform-curator membership is provisioned out of band.

## 3. Database, authorization and migrations

- [ ] Reconcile migration-history drift (ERR-007) using the exact ledger comparison and schema-first procedure in `docs/MIGRATION_RECONCILIATION.md`; do not blindly push or repair the ledger.
- [ ] Apply the complete ordered migration chain to a clean isolated project.
- [ ] Apply `20261101130000_restrict_document_registration_rpc.sql`; confirm authenticated/anon cannot execute the registration RPC and service_role can.
- [ ] Commit and apply the forward-only ERR-123 migration tightening register_uploaded_document page_count from 0–100 to 1–50; confirm its existing locking, idempotency, document/job atomicity and execute grants remain unchanged.
- [ ] Inspect effective execute grants for every exposed function, including SECURITY DEFINER functions and trigger functions.
- [ ] Inspect RLS on every exposed-schema table and all table/view grants; check views for security-invoker behavior where required.
- [ ] Run Supabase security/performance advisors and resolve findings or document a justified exception.
- [ ] Complete all pgTAP authorization, trigger, lifecycle, rollback and concurrency coverage on the latest branch.
- [ ] Complete two-account IDOR tests for documents/pages/questions/solutions, teacher invitations/reviews, chapter notes, syllabus references, practice sets and calendar records.
- [ ] Confirm atomic document upload, worker claim/recovery, completion/failure, correction/approval and quota admission transitions.
- [ ] Confirm no service-role client is imported by client components, middleware or browser-exposed modules.

## 4. Identity, Google Drive and file lifecycle

- [ ] Verify private owner account creation, sign-in, sign-out, password recovery and session expiration.
- [ ] Verify OAuth state mismatch, expired state, account mismatch, redirect URI mismatch and callback replay rejection.
- [ ] Verify Drive refresh-token encryption/decryption, reconnect, disconnect/revocation and key-restore procedure.
- [ ] Verify the exact `drive.file` scope is requested and broader grants are rejected.
- [ ] Verify 50 MB PDF boundary, image-to-PDF conversion, PDF signature, MIME/size verification and duplicate detection.
- [ ] Verify interrupted 1 MB resumable chunks, offset reconciliation, expiry and cross-account upload-session rejection.
- [ ] Verify OCR conversion limits, malformed/oversized provider responses, temporary Google Doc cleanup and human correction.
- [ ] Verify worker retries, stale lease recovery, exhausted attempts and duplicate/concurrent claims.
- [ ] Confirm the original Drive PDF is retained until extraction and review are complete.

## 5. AI, research and academic quality

- [ ] Approve provider data-processing terms, retention behavior, model, budget and fallback policy before live generation.
- [ ] Run the documented cross-subject golden set and manually grade every answer against current authoritative material.
- [ ] Review generated Bengali and English explanations, calculations, units, assumptions and limitations.
- [ ] Verify deterministic checks never imply full conceptual correctness.
- [ ] Verify optional source-page and chapter-note context remains owner-opt-in, bounded and excluded by default.
- [ ] Verify web research sends only the manually entered query and keeps results as unverified source leads.
- [ ] Verify AI answer/note and web-research quota limits, concurrency, fail-closed behavior and cost monitoring.
- [ ] Independently validate mark-scheme sources and locators; do not represent owner-supplied references as certified official schemes.
- [ ] Have a qualified human curator check every seeded Cambridge/Edexcel catalogue heading against the current official syllabus and administrative zone before publication.
- [ ] Verify no draft/retired syllabus catalogue is used for confirmed mappings.
- [ ] Complete chapter-note source-quality review; citation-label validity is not proof that a citation supports a claim.

## 6. Security, privacy and accessibility

- [ ] Run the secret scanner against the complete Git history and rotate any credential ever committed, even if later removed.
- [ ] Resolve ERR-124: remove the legacy minimatch v3 dependency from the development toolchain through a compatible ESLint/Next.js update or a narrowly scoped compatibility patch; then audit the full dependency tree. A production-only audit does not resolve the development-toolchain advisory.
- [ ] Confirm server-only secrets are absent from `NEXT_PUBLIC_*`, source maps, browser bundles, client logs and build output.
- [ ] Verify CSP nonce behavior and security headers in a real browser on the deployed non-production origin.
- [ ] Verify CSRF protections on upload, OAuth and mutation routes.
- [ ] Verify rate limits, body-size caps, request timeouts and streamed response-size caps.
- [ ] Inspect emitted structured logs to prove they contain only allow-listed event, route, safe error code and optional job ID; no user IDs, question text, source content, credentials, exception messages or stack traces.
- [ ] Decide and document retention periods for platform logs and academic content; confirm provider data retention settings.
- [ ] Complete keyboard-only, screen-reader labels, focus visibility, skip link, contrast, reduced-motion and 44px mobile target acceptance.
- [ ] Publish a clear privacy notice describing Google Drive, Supabase, AI-provider and optional web-search data flows before inviting additional users.

## 7. Monitoring and incident response

- [ ] Configure readiness monitor secrets on GitHub and confirm a manual run against the isolated deployment.
- [ ] Confirm the worker schedule, manual dispatch, one-job-per-run behavior and failure notifications.
- [ ] Configure log retention, searchable dashboards and alert thresholds using `docs/OPERATIONS_MONITORING.md`.
- [ ] Assign a human operator and define response ownership; GitHub Actions notifications alone are not guaranteed paging.
- [ ] Confirm the incident runbook covers provider outage, quota-service outage, worker backlog, OAuth compromise, encryption-key loss and suspected data exposure.
- [ ] Record a measured baseline for readiness latency, worker duration and queue age before setting production alert thresholds.
- [ ] Confirm monitoring does not expose tokens, student data, document text or provider error bodies.

## 8. Backup and recovery

- [x] Document Supabase Free backup limitations and explicitly avoid claiming point-in-time recovery.
- [x] Implement encrypted logical database export and archive integrity verification helpers.
- [ ] Create a non-production encrypted backup, verify checksums with the separately stored age identity and copy the encrypted archive to two independent locations.
- [ ] Rehearse roles/schema restore, Auth Admin API account recreation with original UUIDs/password hashes, and application-data restore in that order on a new isolated Supabase project.
- [ ] Confirm source and target Auth password-hashing algorithms match; run the importer with the explicit `RESTORE_PASSWORD_HASH_ALGORITHM` acknowledgement and verify the restored owner can sign in with the original password. Separately account for sessions, phone-based sign-in, MFA, SSO and non-email identities that the current importer intentionally does not restore.
- [ ] Verify the original Drive encryption key and all external credentials are recoverable from the approved secret store.
- [ ] Define and approve recovery-point and recovery-time objectives based on actual backup cadence and measured restore time.
- [ ] Complete a restore drill and record the evidence, gaps and corrective actions.

**Hard limitation:** The Supabase CLI logical dump still excludes managed Auth. The backup helper now exports supported email/password account records separately and `scripts/restore-auth-users.mjs` recreates them through the Auth Admin API with original UUIDs and compatible password hashes. The importer intentionally excludes sessions, MFA, SSO, anonymous and non-email identity accounts. Storage objects, project settings and external Google Drive files also remain outside the archive. The full restore remains unproven until an isolated Free-plan restore drill and original-password sign-in succeed.

## 9. Release and post-release

- [ ] Review all release-blocking items and obtain explicit owner approval.
- [ ] Create a backup immediately before any approved production migration.
- [ ] Review migration SQL and deployment diff; apply migrations in a controlled window only after the migration-history ledger is reconciled.
- [ ] Deploy the approved immutable commit and record deployment ID/URL.
- [ ] Run the approved post-deploy smoke/health checks and verify worker/monitor schedules.
- [ ] Keep a rollback decision record; database changes are forward-only and app rollback compatibility must be checked.
- [ ] Record the release date, commit, migration version, operator and incident contact.

## Current implementation evidence

- Environment preflight: `scripts/validate-production-env.mjs` and `npm run check:production-env`.
- Owner-only provider, credential, backup, legal and operational actions: `docs/OWNER_ACTIONS.md`.
- Deployment runbook: `docs/DEPLOYMENT.md`.
- Backup scope and procedure: `docs/BACKUP_RESTORE.md`.
- Monitoring setup: `docs/OPERATIONS_MONITORING.md`.
- Database/API security findings: `docs/SECURITY_BOUNDARY_AUDIT.md`.
- Read-only migration ledger comparison and schema-first reconciliation procedure: `docs/MIGRATION_RECONCILIATION.md`.
- Security and privacy model: `docs/SECURITY_AND_PRIVACY.md`.
- Detailed acceptance backlog: `docs/ACCEPTANCE_TESTS.md`.
- Error and remediation history: `docs/ERROR_LOG.md`.

## Honest status

The source-level production preflight, Auth account recovery path and release documentation are implemented. Production readiness itself is **not complete** because migrations are unapplied, runtime acceptance and the isolated Auth/data restore drill have not been run, external services are not configured/verified, and security/accessibility/performance acceptance remains outstanding.
