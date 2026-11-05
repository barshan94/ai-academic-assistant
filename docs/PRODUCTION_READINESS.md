## Exact-head CI verification — 2026-11-05 (commit `4c843e1300c91cb191e97aea00c9adb4a5bf0efb`)

- [x] Foundation checks passed (run `41973428124`): lint, type-check, unit tests, production build and Chromium browser smoke tests.
- [x] Database authorization tests passed (run `41973428055`): isolated local migrations and pgTAP.
- [x] Authenticated two-account browser acceptance passed (run `41973428035`).
- [x] Secret scanning passed (run `41973428034`).
- [ ] Live worker invocation/recovery, real interrupted-upload integrity, isolated backup restore, accessibility, academic-quality grading, privacy/legal review and operational ownership remain open.
- [ ] Vercel deployment remains deferred because the account reports a build-rate limit; do not retry repeatedly or upgrade to a paid plan. Deployment is reserved for the final stage.
- PR #1 remains open, draft and unmerged. No Production deployment or production database change was made.

**Decision: NOT APPROVED FOR PRODUCTION.** These four green checks validate this exact feature-branch commit only; they do not satisfy the outstanding live integration, recovery, human-review or release-approval gates.

---

## Latest exact-head verification — 2026-11-05 (commit `97cb3d645d572527826ff74b193e13067e675093`)

- [x] Foundation checks passed (run `41971752436`), including lint, TypeScript validation, unit tests, production build and Chromium browser smoke tests.
- [x] Isolated database authorization passed (run `41971752487`).
- [x] Authenticated two-account acceptance passed (run `41971752421`).
- [x] Secret scanning passed (run `41971752519`).
- [x] The three previously running workflows completed successfully; no failures were reported.
- [ ] Live worker invocation/recovery, real interrupted-upload integrity, isolated restore, accessibility, academic-quality, privacy/legal and operational ownership gates remain open.
- [ ] Vercel deployment remains deferred because of the account build-rate limit; deployment is reserved for the final stage.
- PR #1 remains draft/open and unmerged. No Production deployment or production database change was made.

**Decision: NOT APPROVED FOR PRODUCTION.** Green CI confirms this exact feature-branch checkpoint only; it does not satisfy the outstanding live integration, recovery, human-review or release-approval gates.

---

---

## Latest exact-head verification — 2026-11-05 (commit `97bd02126b3994442f5533b6a3e6f5bb39519112`)

- [x] Foundation checks passed (GitHub Actions run `41970441472`, #2958).
- [x] Database authorization tests passed (run `41970441351`, #1922).
- [x] Authenticated two-account browser acceptance passed (run `41970441357`, #1712).
- [x] Secret scanning passed (run `41970441412`, #1319).
- [x] Removed redundant push-triggered runs for feature-branch commits from Foundation, database authorization and secret-scan workflows. Pull-request checks remain enabled; pushes to `main` and manual dispatch remain enabled. This reduces duplicate CI usage without changing application runtime behavior.
- [ ] Live non-production log-sink inspection, authenticated worker POST evidence, worker concurrency/retry/recovery fault injection, resumable-upload interruption/integrity, isolated restore, accessibility, academic-quality and privacy/legal gates remain open.
- [ ] Vercel Preview/deployment remains deferred due the account build-rate limit; do not pay to bypass it or repeatedly retry. Deployment remains the final step after all other gates.
- PR #1 remains draft/open and unmerged. No Production deployment or production database change was made.

**Decision: NOT APPROVED FOR PRODUCTION.** Green CI verifies this feature-branch commit only; it does not close the live integration and operational gates above.

---

## Superseding verification checkpoint — 2026-11-05, commit `cc1a101b5f32316b913dcf0047458526fcc3b1e3`

- Exact-head Foundation checks passed: lint, TypeScript checks, unit tests, production build and Chromium browser acceptance (run `41969614769`, #2953).
- Exact-head database authorization tests passed (run `41969614711`, #1916).
- Exact-head authenticated browser acceptance passed (run `41969614767`, #1709).
- Exact-head secret scanning passed (run `41969614751`, #1312).
- New tests cover safe operational log metadata, quota-warning severity, OCR/provider exception redaction and failure-state persistence outages. Runtime log-sink inspection remains outstanding.
- Vercel reports a build-rate-limit failure. No repeated deployment attempts or paid upgrade are being made; deployment remains the final step after the limit resets and other gates are satisfied.
- PR #1 remains draft/open and unmerged. No Production deployment or production database change was made.

**Decision remains NOT APPROVED FOR PRODUCTION.** The green CI result validates the exact feature-branch commit, not live Drive/OCR recovery, worker concurrency/retry behavior, backup restoration, AI quality, accessibility, privacy/legal review, Auth leaked-password protection, migration-history reconciliation, or release sign-off.

---

# Production readiness and release gate

## Current decision

> **Status: NOT APPROVED FOR PRODUCTION**

## Superseding verification checkpoint — 2026-11-05

This checkpoint supersedes all earlier status summaries below. The application-code baseline verified before the latest documentation-only audit was `4e105458bff92365589cdca172c65209dccb5acb`; later documentation commits require their own CI confirmation. PR #1 remains draft/open and unmerged.

### Verified CI and dependency state
- On commit `189c76f38f3942d4499afd41a592b72a0af7dce8`, Foundation, Database authorization, Secret scanning and authenticated two-account browser acceptance all passed. Foundation included lint, application/Playwright type checks, production environment preflight, production build, unit tests and Chromium smoke.
- Full `npm audit` including development dependencies: **0 vulnerabilities**. `npm audit --omit=dev`: **0 vulnerabilities**. ERR-124 is closed for the current lockfile; the older 13-moderate finding is no longer reproduced.
- A subsequent commit `fc8a887` includes a new database migration and documentation updates. Its Foundation, Database authorization and Authenticated E2E runs are still in progress; secret scanning passed. Do not reuse the prior SHA's green checks as proof for this newer SHA.
- GitHub's Vercel status check on `fc8a887` reports success. The exact deployment artifact, runtime environment and feature URL still need provider-side verification.

### Live non-production Supabase inspection
- Project `academic-assistant` (`uqpyzicftxxegajaocxi`) remains ACTIVE_HEALTHY, PostgreSQL 17.11, Free plan, region `ap-south-1`.
- All 31 public base tables have RLS enabled. No anon table SELECT/INSERT grants were found. Four quota tables intentionally have no client grants or policies.
- Fourteen authenticated-callable SECURITY DEFINER RPCs were inspected: each uses an empty search_path, denies anon EXECUTE, requires `auth.uid()`, and scopes operations to the caller's owner ID. They remain authenticated-callable by design; do not mechanically convert them to SECURITY INVOKER.
- Supabase security advisor still reports the 14 authenticated-callable SECURITY DEFINER warnings and one actual Auth warning: leaked-password protection is disabled. Four RLS-enabled/no-policy quota-table notices correspond to private counters with no client grants.
- Five missing child-side FK indexes were added in hosted migration `20261105020059_index_remaining_foreign_key_columns`, mirrored in the repository, and verified. A catalog query now reports **zero unindexed public foreign keys**; the performance advisor no longer reports that category. No unused indexes were dropped.
- The hosted migration ledger has 102 entries and the repository has 102 migration files. Three older SQL-equivalent timestamp/name history mismatches remain. The guarded history-only reconciliation/dry-run workflow has not been dispatched in this session; no repair of those three entries is claimed.
- Latest live aggregate data (2026-11-05): one Drive connection; three documents (one ready, two review_required); two completed jobs; three pages; zero queued/running/failed jobs. Two documents have Drive IDs and SHA-256/file-size integrity metadata. This proves prior worker execution and persisted integrity metadata, not fresh resumable-upload recovery, original-PDF round-trip acceptance or OCR accuracy.
- The checked-in `.github/workflows/document-worker.yml` currently exposes `workflow_dispatch` only. It does not define a recurring schedule; manual dispatch is required until a scheduler is deliberately integrated and verified.

### Remaining mandatory release gates
1. Run the guarded non-production migration-history repair for the three previously verified SQL-equivalent pairs, then inspect the schema dry-run and retain the workflow evidence. **This is not read-only:** the workflow repairs the hosted migration ledger before running the dry-run. Apply pending DDL only after separately reviewing the exact output and explicitly approving it.
2. Resolve the leaked-password risk within the Supabase Free constraint. Supabase documents this built-in control as Pro-and-above; it cannot be enabled on the current Free project. Do not claim this gate is complete unless an equivalent independently reviewed application-level mitigation is implemented and accepted. (A paid upgrade is not assumed or authorized.)
3. Complete Google Drive OAuth, resumable upload interruption/resume, original-PDF integrity retrieval, OCR and worker acceptance using a dedicated test file/account.
4. Select/approve the AI provider, model, data-processing terms and spend limit; configure credentials; run the golden set and obtain independent human grading.
5. Complete an encrypted backup and isolated restore drill, including original-password sign-in and Drive-token decryption.
6. Complete manual keyboard/screen-reader/contrast/reflow and real Android device accessibility acceptance.
7. Obtain official syllabus provenance and independent answer/mark-scheme review for each supported board/qualification/subject.
8. Obtain qualified privacy/legal review, confirm data-flow/retention/vendor terms and assign named primary/backup operators with an incident exercise.
9. Verify production-only environment values and deployment configuration using authorized Vercel access.
10. Obtain explicit release sign-off, merge the reviewed PR, and deploy the immutable release commit only after all preceding gates pass.

**Decision: NOT APPROVED FOR PRODUCTION.** CI success and the completed index remediation do not satisfy the remaining integration, recovery, human-review, Auth-setting or release-approval gates. Production remains on the older `main` deployment; no production migration or deployment was performed in this session.


The application has substantial feature and security implementation, but production readiness is not established. This document is the single release gate checklist. A checkbox is complete only when the named evidence exists; source code or documentation alone does not satisfy a runtime acceptance item.

The owner selected infrastructure constraint remains Supabase Free only. No paid upgrade, production migration, merge to `main`, or hosted deployment is authorized by this document. Actions requiring provider credentials, legal decisions, account provisioning or an assigned human operator are listed in [OWNER_ACTIONS.md](./OWNER_ACTIONS.md).

## Latest CI regression — 2026-11-04

- The feature head's foundation checks passed lint, application and Playwright type-checks, unit tests, production build and Chromium smoke. The authenticated document/teacher acceptance job failed in the teacher review lifecycle.
- The dedicated two-account workflow failed in the same lifecycle but at a different assertion. GitHub run records show overlapping foundation and dedicated authenticated runs started together. The foundation workflow had duplicate authenticated acceptance on both push and pull-request events, while a separate authenticated workflow also ran on pull requests.
- Mitigation committed: the foundation workflow no longer runs authenticated account tests; the dedicated authenticated workflow is the only path and now serializes by PR head branch. The exact session invalidation mechanism is still an inference until a serialized rerun passes.
- The current GitHub Actions integration did not expose workflow dispatch, and no new run for the mitigation commit was available in the Actions API at this checkpoint. **The teacher-review lifecycle remains unverified and is a release blocker.**
- Do not weaken or skip the teacher-review assertions to make CI green.

## Latest live checkpoint — 2026-11-04

This section supersedes the older live-environment counts below; earlier snapshots are retained as history.

- Feature branch head: `b135a769bb9ee3402b518ec669a556e8728665fb`, including the latest `main` commit. The last fully verified feature-code Preview is READY at `4e7208902b30dd422e9fcc07a7808958e0613ce1`; Preview for the newer merge commit is not yet confirmed. Production remains on `main` commit `cd3620fad75d343c3d7160257ab044222ce82c7a`.
- Foundation workflow `41873195219` passed lint, type checks, unit tests, build, Chromium smoke and authenticated document/teacher acceptance. Database authorization workflow `41873195229` and secret scan `41873195288` passed.
- Vercel Preview environment entries exist for Supabase server access, Google OAuth/Drive encryption and cron. Secret values were not decrypted or validated. No AI provider/model or Brave Search credential entry was found. Production-target server credentials were not present in the inspected environment inventory.
- The connected non-production Supabase project is ACTIVE_HEALTHY (Free, PostgreSQL 17.11, `ap-south-1`). Repository and hosted migration inventories each contain 101 entries: 98 exact version/name matches and three SQL-equivalent timestamp/name mismatches. The guarded history-repair/dry-run workflow has not been run; no hosted schema or ledger mutation was made in this inspection.
- Current security advisor findings: 14 authenticated-callable SECURITY DEFINER RPCs and one non-callable trigger function. Inspected functions use an empty search path, reference `auth.uid()`, and deny anon EXECUTE. These require continued owner-authorization review and documented justification, not a blanket conversion to invoker. Four quota tables have RLS enabled with no client policies or client grants, as intended.
- Supabase Auth leaked-password protection is disabled. Performance advisor reports five unindexed foreign keys and 47 unused-index notices. The five FK indexes require review; unused-index notices are informational and are not grounds for automatic deletion.
- ERR-124 remains open: 13 moderate development-toolchain audit findings; production-only dependency audit is clean.
- The latest manual document-worker invocation on `main` (run `41799486679`) returned success/2xx. It proves the protected route responded, not that a real queued document completed. The workflow is deliberately manual-only until release approval; its five-minute schedule is not enabled.
- PR #1 is still draft. The single conflict caused by the new manual worker workflow on `main` was resolved on the feature branch by integrating the latest `main` commit and retaining the safer manual-only worker workflow. GitHub now reports the PR mergeable, but new checks are pending. The PR has not been merged.
- Production approval remains **withheld**. The live AI provider and optional web research are not configured; Google Drive round-trip acceptance, worker operation, migration-history reconciliation evidence, full isolated backup/restore drill, privacy/accessibility/academic review, and production environment validation remain open.

The feature branch CI passing does not override these release blockers. Do not merge or deploy the feature to Production until each required gate has evidence and the owner explicitly approves the release.

## Release principles

- Testing is now authorized on `feature/m3-ai-solver`; record failures and fixes separately, and do not treat a green isolated CI run as production release approval.
- Use a disposable non-production Supabase project and dedicated Google OAuth client for all integration and recovery work.
- Keep production secrets out of source, browser bundles, logs, GitHub issues and test environments.
- Never label AI output, syllabus mappings, mark-scheme sources or OCR as verified unless the corresponding human/technical verification actually occurred.
- Prefer a reviewed forward database migration to a speculative rollback.
- Do not exceed the approved free-tier and external-provider budgets. AI and web search can incur charges.

## Latest verified checkpoint — 2026-11-03

Current branch head `cd25c72efde45f00984bb5e7d23ae59b8ca30086`:
- Foundation `41597601824`: lint, application/Playwright type-checks, environment contract validation, production dependency audit, build and **207 unit tests across 40 files** passed. Production-only npm audit: zero findings; full development dependency tree: **13 moderate findings** (ERR-124 remains open).
- Chromium smoke: **10 passed, 1 skipped** (authenticated two-account lifecycle).
- Database authorization `41597602010`: fresh isolated local migration replay and **236 pgTAP assertions across 11 files** passed.
- Secret scan `41597602016`: passed.
- Authenticated browser workflow `41597601831`: skipped because dedicated non-production credentials are absent; not a pass.

Fresh read-only hosted Supabase inspection on 2026-11-03 confirms project `academic-assistant` is ACTIVE_HEALTHY on Free/PostgreSQL 17.11/ap-south-1, but its ledger remains at 53 migrations with 44 genuinely pending after the two exact version/name mismatches are reconciled. The hosted `documents.page_count` constraint remains weaker than the branch's intended 1–50 contract. Security advisor: zero findings; performance advisor: 60 informational unused-index notices. No hosted changes were made. The local CI database is not the hosted project.

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
- Latest verified application-code commit: `086c19c21b20187758330dbbd5053b05cf1535eb` (subsequent commits only refreshed documentation). Foundation run `41595253539` passed ESLint, application/Playwright type-checks, production environment contract validation, production-dependency audit, production build and **207 unit tests across 40 files**. Chromium browser smoke passed **10 tests**, with the authenticated two-account test skipped. Database run `41595253518` replayed the repository migration chain on a fresh isolated local Supabase database and passed **236 pgTAP assertions across 11 files**; secret scanning run `41595253441` passed. Authenticated two-account run `41595259318` was skipped because dedicated non-production credentials/enablement are absent. These results are isolated CI evidence only, not hosted integration or release acceptance.

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


## Latest hosted migration reconciliation — 2026-11-01

- [x] Owner confirmed the existing Free-plan `academic-assistant` project as the dedicated non-production target and authorized the two version-history repairs plus the pending migration chain; no reset, other project, production deployment or merge is included.
- [x] Refreshed inventory: 97 repository migration files, 53 hosted ledger entries, 51 exact version/name matches, and two hosted-only version identifiers whose stored SQL statements were verified byte-for-byte against the corresponding repository files.
- [x] The two old/new version pairs are identified in `docs/MIGRATION_RECONCILIATION.md`; the pinned-CLI script repairs the old ledger versions as reverted and the exact repository versions as applied without rerunning their DDL.
- [x] After those two repairs, 44 repository migrations remain to apply in chronological order, including the two Cambridge/Edexcel draft seed migrations and the ERR-161 privilege-hardening migration.
- [x] Read-only object audit found the five shared-reference tables, 13 indexes, four functions, four triggers and 12 policies. Shared-reference seed tables were empty before the pending seed migrations.
- [x] The forward-only ERR-161 migration revokes direct EXECUTE on three trigger-only helper functions; fresh isolated CI replay and pgTAP cover the effective privileges and trigger presence.
- [x] Fresh isolated CI run on `ffd3302775911969c8e54ec282fd9250dcff4122` replayed the complete repository migration chain and passed 236 pgTAP assertions across 11 files.
- [ ] Execute the pinned Supabase CLI reconciliation script against the already-approved non-production project, beginning with the two version-aware ledger repairs and the full `--include-all --dry-run`; stop on any unexpected migration ordering or schema error.
- [ ] After the dry-run is reviewed, apply the 44 pending migrations, then verify the 97 expected ledger versions, schema, seed counts, RLS/ACLs, advisors and authenticated two-account workflows.


## Latest verification snapshot — 2026-11-03

Feature-branch commit `bfb4cd96361d16aca395983416de2952e18b978f` completed the following GitHub Actions workflows successfully:

- Foundation checks: lint, production-dependency audit, environment-contract preflight, application and Playwright type-checks, unit tests, production build, and Chromium browser smoke tests all passed (run `41587973785`).
- Database authorization workflow: fresh isolated local Supabase migration replay and pgTAP suite passed (run `41587978505`).
- Secret scanning passed (run `41587978500`).
- Authenticated two-account acceptance was **skipped** (run `41587978576`) because non-production test credentials are not configured. This is not a pass.

A fresh read-only inspection of the existing non-production Supabase project on 2026-11-03 found 53 hosted migration-ledger entries against 97 repository migrations, 21/21 public tables with RLS enabled, zero security-advisor findings, and 60 informational unused-index notices. The migration ledger remains unreconciled; see `docs/MIGRATION_RECONCILIATION.md`. No hosted migration, ledger repair, schema mutation, production deployment or merge was performed.

These results validate the feature-branch CI snapshot only. They do not establish hosted migration parity, live Google Drive/OAuth, live AI provider behavior, authenticated two-account authorization, restore readiness, accessibility acceptance or production approval. The release decision remains **NOT APPROVED FOR PRODUCTION**.


## Superseding operational checkpoint — 2026-11-03

- Current feature branch head at this documentation update: `1865aa2be3a1a2e695fd595af3f0888b222f7726`. The application-code baseline remains `086c19c21b20187758330dbbd5053b05cf1535eb`; later code changes are limited to migration-runner credential handling and its regression tests.
- Commit `134faae82e4bbf945e8e19535f39d39eb9106253` passed foundation, Chromium smoke, isolated database authorization and secret scanning. The next code/tooling commit `b234a8e9fc855c12a5870b366e894ddad9f65cb8` adds a regression check for exactly one xtrace disable and credential export; its CI was still running at the last check. Current documentation-only commits have secret scanning passed; foundation/database workflows are queued or running. Authenticated two-account acceptance remains skipped.
- Operations-only PR #2 is merged to `main` as `fbca5d21cc6325b43a47ecbd7a5d5f487b7579c4`; the manual non-production migration workflow is now available. It has not run because the two repository Actions secrets are not configured.
- Hosted Supabase remains unchanged at 53 migration-ledger entries. No ledger repair, pending DDL, production merge, or deployment has occurred.
- The release decision remains **NOT APPROVED FOR PRODUCTION**. Hosted migration reconciliation, two-account acceptance, Google Drive/OAuth and AI provider runtime tests, backup/restore drill, accessibility and academic/privacy review remain outstanding. Full dev dependency audit remains at 13 moderate findings (ERR-124); production-only audit is clean.


## Superseding hosted migration checkpoint — 2026-11-03 12:15 UTC

The guarded workflow completed successfully on feature-branch head `950e67404a99f5479bbb3b1476c482bd36813a37` (run [41634053668](https://github.com/barshan94/ai-academic-assistant/actions/runs/41634053668)).

- [x] Confirmed the workflow checked out `feature/m3-ai-solver`, validated the two repository Actions secrets, linked only to approved non-production project `uqpyzicftxxegajaocxi`, and used pinned Supabase CLI `2.122.0`.
- [x] Reconciled the two byte-identical migration-history pairs: hosted-only versions `20261031031132` and `20261031031233` were marked reverted; repository versions `20261031031012` and `20261031031212` were marked applied. Their DDL was not rerun.
- [x] Full `--include-all` dry-run completed successfully and enumerated **44 pending migrations** (from `20261031061000` through `20261101160000`).
- [x] Confirmed the workflow stopped after dry-run with `APPLY_PENDING_MIGRATIONS=false`. **No pending migration DDL was applied.** No reset or production deployment occurred.
- [ ] Review the 44-migration plan and obtain explicit owner authorization before running the guarded apply operation.
- [ ] After an approved apply, verify the hosted schema, expected 97-version migration ledger, seed counts, page-count constraint, effective grants/RLS, advisors and authenticated two-account behavior.

Latest CI on the same feature head: Foundation `41624009496`, Database authorization `41624009512`, and Secret scanning `41624009500` passed. Authenticated browser acceptance `41624009442` was skipped because dedicated test credentials are not configured. PR #1 remains open, draft and unmerged.

The successful dry-run is a meaningful migration-readiness milestone, not production approval. External Google Drive/OAuth and AI-provider acceptance, two-account authorization, backup/restore rehearsal, accessibility, academic/privacy review, and ERR-124 development dependency remediation remain open.

## Superseding automated checkpoint — 2026-11-04

The previous dated snapshots below are historical. On feature head `ebf318d96a20de2bfeddf6f4fe0ae9fba6813a7a`, fresh workflows all completed successfully:

- Foundation `41759875205`: lint, application and Playwright type-checks, synthetic production-environment preflight, production-only audit, build and **213 unit tests across 41 files** passed; Chromium smoke tests passed.
- Database authorization `41759875197`: isolated Supabase initialization, full migration replay and pgTAP authorization suite passed.
- Authenticated two-account acceptance `41759875203`: passed.
- Full-history secret scan `41759875260`: passed.

The prior database failure on `aee8269` was fixed by closing four malformed pgTAP SQL dollar-quote delimiters in commit `ebf318d`; the new isolated database workflow passes.

The full development dependency audit still reports 13 moderate transitive minimatch advisory instances in the legacy ESLint dependency graph. Production-only audit is clean. ERR-124 remains open; no incompatible override or force-upgrade was applied. All external/runtime release gates below remain open unless separately supported by evidence. A successful isolated CI run is not production approval.
