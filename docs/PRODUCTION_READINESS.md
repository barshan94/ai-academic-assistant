# Production readiness and release gate

## Current decision

> **Status: NOT APPROVED FOR PRODUCTION**

The application has substantial feature and security implementation, but production readiness is not established. This document is the single release gate checklist. A checkbox is complete only when the named evidence exists; source code or documentation alone does not satisfy a runtime acceptance item.

The owner selected infrastructure constraint remains Supabase Free only. No paid upgrade, production migration, merge to `main`, or hosted deployment is authorized by this document. Actions requiring provider credentials, legal decisions, account provisioning or an assigned human operator are listed in [OWNER_ACTIONS.md](./OWNER_ACTIONS.md).

## Release principles

- Testing is now authorized on `feature/m3-ai-solver`; record failures and fixes separately, and do not treat a green isolated CI run as production release approval.
- Use a disposable non-production Supabase project and dedicated Google OAuth client for all integration and recovery work.
- Keep production secrets out of source, browser bundles, logs, GitHub issues and test environments.
- Never label AI output, syllabus mappings, mark-scheme sources or OCR as verified unless the corresponding human/technical verification actually occurred.
- Prefer a reviewed forward database migration to a speculative rollback.
- Do not exceed the approved free-tier and external-provider budgets. AI and web search can incur charges.

## 1. Application and release artifact

- [ ] Freeze the implementation scope and publish a reviewed release candidate commit.
- [x] Re-run lint, application/Playwright type-check, 34 Vitest files / 176 unit tests, production build and Chromium browser smoke tests on `d0c9ab16bbb0f1f4767448ebc1fd76d039c8589d`; GitHub Actions foundation run `41314360350` passed both foundation and Chromium jobs. The isolated migration and pgTAP workflow `41314360274` passed all 220 assertions across 10 SQL files; secret scanning passed in `41314360198`. Authenticated two-account acceptance was skipped because non-production credentials are not configured. This does not close live integration or production acceptance.
- [x] Complete automated lint, application/Playwright type-check, 155 unit tests across 30 files and production build on feature-branch commit `b929566a8d175ff1f3894da706ba64414e40ccf2` (GitHub Actions run `41306988899`). Live integration acceptance remains listed separately below.
- [x] Complete credential-free Chromium smoke suite (9 passed / 1 skipped; authenticated flow is separate) on `b929566a8d175ff1f3894da706ba64414e40ccf2`.
- [ ] Complete mobile responsive/accessibility acceptance.
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
- [x] Apply the complete ordered repository migration chain to a fresh isolated local Supabase database in CI; all migrations completed successfully.
- [ ] Repeat against a dedicated non-production hosted project after migration-history reconciliation and explicit target approval.
- [ ] After full migration reconciliation and explicit target approval, apply `20261101130000_restrict_document_registration_rpc.sql`; confirm authenticated/anon cannot execute the registration RPC and service_role can. The fresh connected-schema spot-check found no registration RPC in public/private.
- [x] Commit the forward-only ERR-123 migration `20261101140000_tighten_uploaded_document_page_count.sql`, tightening `register_uploaded_document` page_count from 0–100 to 1–50. Applying it and confirming locking, idempotency, document/job atomicity and effective execute grants remain testing-phase tasks.
- [ ] Inspect effective execute grants for every exposed function, including SECURITY DEFINER functions and trigger functions.
- [ ] Inspect RLS on every exposed-schema table and all table/view grants; check views for security-invoker behavior where required.
- [ ] Run Supabase security/performance advisors and resolve findings or document a justified exception.
- [x] Execute current pgTAP suite on the latest tested branch commit `1436fad6e78bd2026883c09fab75262bd4f36cfc`; the complete ordered migration chain and pgTAP suite passed on a fresh isolated local Supabase database (workflow `41309812359`).
- [ ] Expand acceptance to authenticated two-account IDOR, concurrency and hosted-project behavior where not covered by current fixtures.
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
- [ ] Resolve ERR-124: GHSA-g3hv-75wg-m249 / CVE-2026-118764 flags root `minimatch@3.1.5` under its `<11.0.1` range. Static inspection of upstream v3.1.5 source found none of the optimizer/globparts code described in the CVE (the advisory's technical description identifies v10.2.6), but this is not an official exemption. Obtain upstream clarification or migrate the legacy ESLint/Next.js toolchain with compatibility evidence; run and retain the full dev-inclusive audit. Production-only audit currently reports zero vulnerabilities; install reports 13 moderate findings in the full tree.
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
- Latest feature-branch CI on `d0c9ab16bbb0f1f4767448ebc1fd76d039c8589d`: lint, all TypeScript checks, 176 unit tests / 34 files, production build, isolated Supabase migration chain and 220 pgTAP assertions / 10 SQL files passed; Chromium smoke 10 passed / 1 skipped; secret scan passed. Authenticated two-account acceptance was skipped for missing dedicated credentials, not passed. ERR-156 worker queue starvation regression is included in the isolated pgTAP suite.

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


## Additional acceptance procedures added — 2026-11-01

The following supporting procedures are now committed on this feature branch. Their existence does not close the corresponding runtime or human gate:

- `docs/ISOLATED_BACKUP_RESTORE_DRILL.md` — aligned to the actual encrypted backup and archive-verification scripts; explicitly distinguishes archive integrity from full restore and records excluded Auth/Storage/Drive state.
- `docs/ERR-124_MINIMATCH_REMEDIATION.md` — records the observed legacy v3 and nested v11 lockfile paths and the safe remediation/verification sequence. ERR-124 remains open.
- `docs/ACCESSIBILITY_ACCEPTANCE.md` — manual keyboard, NVDA, TalkBack, contrast, zoom/reflow and device acceptance matrix. Manual acceptance remains open.
- `docs/ACADEMIC_PRIVACY_OPERATIONS_ACCEPTANCE.md` — official syllabus validation, independent grading, privacy/legal review and named primary/backup operator gates. All remain open pending human evidence.

Do not check any runtime or external-review item above until the evidence is attached to the tested commit and reviewed by the release owner.


## Connected Supabase project inventory — 2026-11-01

- [x] Read-only inventory confirms the existing Free organization and `academic-assistant` project are active and healthy in `ap-south-1`; no additional account or project was created.
- [x] Confirmed the connected academic project currently has zero Auth users, profiles, documents and processing jobs, zero Storage buckets, and no deployed Edge Functions.
- [x] Confirmed all 21 public tables have RLS enabled and the security advisor currently reports no findings; performance advisor unused-index notices are informational and have not been acted on.
- [ ] Complete object-by-object reconciliation of all remote migration effects against the repository's ordered migration chain before any hosted migration or authenticated integration acceptance.
- [ ] Configure and verify Google OAuth/Drive, AI provider, worker scheduler and authenticated test credentials in a non-production environment.



## Additional hosted privilege audit — 2026-11-01

- [x] Read-only catalog audit confirms no direct anon table privileges in the connected application's public schema, RLS enabled on all 21 public tables, and no public views.
- [x] Confirmed the only public SECURITY DEFINER function is service-role/postgres-only; no anon or authenticated EXECUTE privilege was found for it.
- [ ] Validate effective RLS behavior with two disposable authenticated accounts; catalog policy inspection alone is not an IDOR acceptance test.
- [ ] Reconcile and apply the missing document registration/page-count migrations only after the full migration chain is compared and the owner approves the target and plan.
