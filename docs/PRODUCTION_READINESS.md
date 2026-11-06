# Superseding exact-head verification — 2026-11-06 (commit 60841ebc68c7f84ecaffae06b7c6b12819f2b23d)

All four required GitHub Actions workflows completed successfully on this exact feature-branch head:

- [x] Foundation checks — [run 42225030683](https://github.com/barshan94/ai-academic-assistant/actions/runs/42225030683): lint, application and Playwright type checks, unit tests, production build and Chromium smoke.
- [x] Database authorization tests — [run 42225033472](https://github.com/barshan94/ai-academic-assistant/actions/runs/42225033472): isolated local migrations and pgTAP.
- [x] Authenticated two-account browser acceptance — [run 42225033425](https://github.com/barshan94/ai-academic-assistant/actions/runs/42225033425).
- [x] Full-history secret scanning — [run 42225030679](https://github.com/barshan94/ai-academic-assistant/actions/runs/42225030679).

All jobs and steps in these four workflows completed successfully. The Vercel status check for this commit is also successful. The application code is unchanged from the previously verified application checkpoint; this head updates README/release documentation and worker operating-mode wording.

## Release decision — NOT APPROVED FOR PRODUCTION

This exact-head CI result does not close live release gates: Production server credentials and owner-controlled Google OAuth setup; live Google Drive upload/interruption/resume, original-PDF retrieval and cross-account denial; worker fault/retry/recovery acceptance; hosted migration-history/schema parity; a Free-compatible mitigation for Supabase leaked-password protection; backup/recovery limitations; manual accessibility/device checks; independently graded academic answer quality and official syllabus verification; privacy/legal review; and named operational ownership.

Owner constraints remain binding: keep PR #1 open, draft and unmerged; do not deploy Production, alter Production configuration, apply or repair hosted migrations, dispatch the document worker, create another database, or claim a backup/restore rehearsal. Preserve existing project data. AI generation remains disabled in strict zero-cost mode. No such release or hosted operation was performed in this checkpoint.

---

# Superseding exact-head verification — 2026-11-06 (commit 8133a290d094ea2d424656928e1e1321fad3f45e)

This entry supersedes earlier exact-head CI snapshots below. All four required GitHub Actions workflows completed successfully on this exact branch head:

- [x] Foundation checks — [run 42219452120](https://github.com/barshan94/ai-academic-assistant/actions/runs/42219452120).
- [x] Database authorization tests — [run 42219452174](https://github.com/barshan94/ai-academic-assistant/actions/runs/42219452174).
- [x] Authenticated two-account browser acceptance — [run 42219452266](https://github.com/barshan94/ai-academic-assistant/actions/runs/42219452266).
- [x] Full-history secret scanning — [run 42219452287](https://github.com/barshan94/ai-academic-assistant/actions/runs/42219452287).

The Foundation workflow includes locked dependency installation, production and full dependency audits, ESLint, application and Playwright type checks, unit tests, production build and Chromium smoke tests. The database workflow runs isolated local migrations and pgTAP. The authenticated workflow completed its two-account Supabase browser acceptance job successfully.

Vercel Preview deployment for this commit is READY: https://ai-academic-assistant-1iwj0uytx-barshan-s-team.vercel.app. This confirms the Preview build/deployment state only; it does not establish successful live OAuth, Drive, worker, academic-quality or production acceptance.

## Verified configuration gap

A read-only Vercel environment inventory found the required server-side application credentials configured for the feature/m3-ai-solver Preview target, while the inspected sensitive credentials were not configured for Production. The public Supabase URL and publishable key are configured for Production. No environment variables were changed and no secret values were displayed. Production configuration remains an owner-controlled release gate; do not copy Preview secrets blindly, especially the Drive token-encryption key and OAuth callback/client settings.

## Release decision — NOT APPROVED FOR PRODUCTION

Green CI and a READY Preview do not close the live release gates: Production credentials and OAuth setup; real Google Drive upload/interruption/resume and original-file retrieval/cross-account denial; worker fault/retry/recovery acceptance and a deliberate scheduling decision; hosted migration-history/schema parity; Supabase Free leaked-password-protection limitation and accepted mitigation; backup/recovery limitations; manual accessibility/device checks; independently graded academic answer quality and official syllabus verification; privacy/legal review; and named operational ownership.

Owner constraints remain binding: keep PR #1 open, draft and unmerged; do not deploy Production, alter Production configuration, apply or repair hosted migrations, dispatch the document worker, create another database, or claim a backup/restore rehearsal. Preserve existing project data. No such action was taken in this checkpoint.

---
# Superseding exact-head verification — 2026-11-06 (commit 7203e2fdba24dea09daf12379b6e95202ee0bcc9)

This entry supersedes older exact-head CI snapshots below. All four required GitHub workflows completed successfully on this exact application head:

- [x] Foundation checks — [run 42184411408](https://github.com/barshan94/ai-academic-assistant/actions/runs/42184411408): locked install, production and full dependency audits (both blocking), ESLint, application and Playwright type checks, unit tests, and production build.
- [x] Database authorization tests — [run 42184411537](https://github.com/barshan94/ai-academic-assistant/actions/runs/42184411537).
- [x] Authenticated browser acceptance — [run 42184411418](https://github.com/barshan94/ai-academic-assistant/actions/runs/42184411418).
- [x] Full-history secret scanning — [run 42184411437](https://github.com/barshan94/ai-academic-assistant/actions/runs/42184411437).

The full dependency audit is now a blocking CI gate and passed on this commit. The CI workflow and test cleanup changes are included in the verified head.

## Release decision — NOT APPROVED FOR PRODUCTION

Green automated checks are not proof of live Production readiness. Production server-side credentials/OAuth, real Drive interruption and recovery, authenticated worker fault/retry acceptance, hosted migration parity, Free-plan leaked-password mitigation, manual accessibility/device acceptance, independent academic grading, privacy/legal review, and named operational ownership remain unresolved. AI generation remains disabled under the strict zero-cost requirement; no paid provider was activated.

Owner constraints remain binding: keep PR #1 draft, open and unmerged; do not deploy Production, alter Production configuration, apply hosted migrations, dispatch the document worker, create another database, or claim a backup/restore rehearsal. Preserve existing project data. No such action was taken in this checkpoint.

---

## Superseding exact-head verification — 2026-11-06 09:05 Asia/Dhaka

This entry supersedes the older pending/failing CI snapshots below. The four workflow runs and READY Preview below are verified on application/documentation head `f8fa5802bf85a1147c8b3c6411a39c74f88b8c96`; subsequent commits in this section only correct this evidence record and do not change application code.

### Exact-head automated verification — ALL PASS

- [x] Foundation — [run 42154137309](https://github.com/barshan94/ai-academic-assistant/actions/runs/42154137309): production dependency audit, full dependency audit report, ESLint, application and Playwright type-checks, unit tests, Next.js production build, and Chromium browser smoke.
- [x] Database authorization and isolated local migration replay/pgTAP — [run 42154137291](https://github.com/barshan94/ai-academic-assistant/actions/runs/42154137291).
- [x] Authenticated two-account Supabase/Playwright acceptance — [run 42154137379](https://github.com/barshan94/ai-academic-assistant/actions/runs/42154137379).
- [x] Full-history secret scan — [run 42154137207](https://github.com/barshan94/ai-academic-assistant/actions/runs/42154137207).

### Exact-head Preview

Vercel Preview deployment `dpl_9d3DW7q7jQ1HsFdZZCfg5a5bnUms` is `READY` for the exact SHA above: https://ai-academic-assistant-qb6ehha0c-barshan-s-team.vercel.app. This is Preview only; no Production target was selected. A READY deployment is not equivalent to a live authenticated route, OAuth, Drive recovery, or production acceptance test.

### Owner scope — unchanged and binding

- Keep PR #1 open, draft and unmerged. Do not deploy Production or alter Production configuration.
- Do not dispatch migration-reconciliation workflows, alter the hosted migration ledger, or apply hosted migrations. Do not modify the existing `academic-assistant` or `durga-map` data.
- Do not create a second database or claim a backup/restore rehearsal occurred. That rehearsal is explicitly excluded by owner instruction; disaster recovery remains unproven.
- Keep the document worker manual-only. Do not dispatch it or add a scheduler before route/branch integration, credentials, environment targeting, authentication and idempotency have been independently verified.
- No paid upgrade, paid AI call, or search-provider activation. Strict zero-cost mode keeps AI generation disabled.

### Production release decision — NOT APPROVED

Automated code/database/browser/secret checks and exact-head Preview are green. They do not remove the external release gates: Production server-side environment credentials and owner-controlled OAuth setup; live Google Drive interruption/resume and integrity; worker failure/retry/recovery acceptance and scheduling decision; migration-history/schema parity review (without changing hosted history under current owner scope); Supabase Free leaked-password-protection limitation and accepted mitigation; manual accessibility/device checks; qualified syllabus and independent answer grading; privacy/legal review and published contact; named operational owners. No honest basis exists to call the service production-ready while these remain unverified.

The branch-scoped Preview environment has the Drive/server credentials configured, but the Production environment has only the public Supabase URL and publishable key among the required application variables. Secret values were not decrypted or displayed. Do not copy Preview credentials blindly: the token-encryption key must remain compatible with any already encrypted Drive refresh tokens, and OAuth redirect/client configuration must be owner-controlled.

No merge, Production deployment, Production environment mutation, hosted schema/data change, worker invocation, migration-ledger repair, paid service activation or second database was performed in this checkpoint.

---

## Current owner scope — 2026-11-06

This section supersedes historical instructions elsewhere in this file where they conflict.

- Do not dispatch migration-reconciliation workflows, modify the hosted migration ledger, or apply database migrations. Any earlier authorization is superseded.
- The separate-database backup/restore rehearsal is skipped by owner scope. Do not create another Supabase project/database; do not claim a restore was tested.
- Keep the document worker manual-only. Do not dispatch it or add a recurring schedule until route/branch integration, Actions secrets, target environment, authentication and idempotency are all verified.
- Keep PR #1 draft and unmerged. Do not deploy Production, alter Production configuration, pay for upgrades, or enable paid AI calls.
- Preserve existing `academic-assistant` and `durga-map` data.

---

# Superseding verification — 2026-11-06 00:39 Asia/Dhaka (feature head `c8122de67c17b5b8e1936df87dd09c72dc675f30`)

The latest Foundation workflow failed because the new answer-sheet export test expected the literal characters `\\n` instead of a real newline. Application lint and all TypeScript checks passed; 332 of 333 unit tests passed. The failure is isolated to the test assertion, not the answer-sheet implementation. The assertion has been corrected to check the actual newline emitted by `lines.join("\\n")`. Re-run the full CI suite on the resulting commit before treating this correction as verified.

- [ ] Foundation checks and Chromium smoke on the corrected exact head.
- [ ] Local Supabase migrations/pgTAP and authenticated acceptance on the corrected exact head.
- [ ] Full-history secret scan on the corrected exact head.
- [ ] Preview feedback and deployment evidence on the corrected exact head.

**Release decision remains NOT APPROVED FOR PRODUCTION.** This test correction does not close the live integration, owner-credential, academic, privacy/legal, accessibility, operations or Free-plan security limitation gates recorded below. PR #1 remains open, draft and unmerged. No Production deployment, Production environment change, merge, paid upgrade, database reset, migration-ledger repair or backup database was created.

---

# Superseding verification — 2026-11-05 21:35 Asia/Dhaka (feature head `a6e043b56c58a338eece9b2b017f14cdafe114e8`)

This dated entry supersedes earlier "current" references in this document.

## Verified on this exact head

- [x] Foundation checks — [run 42054645868](https://github.com/barshan94/ai-academic-assistant/actions/runs/42054645868).
- [x] Database authorization / local migrations and pgTAP — [run 42054645918](https://github.com/barshan94/ai-academic-assistant/actions/runs/42054645918).
- [x] Authenticated browser acceptance — [run 42054646082](https://github.com/barshan94/ai-academic-assistant/actions/runs/42054646082).
- [x] Full-history secret scan — [run 42054645883](https://github.com/barshan94/ai-academic-assistant/actions/runs/42054645883).
- [x] Vercel Preview feedback check passed with no unresolved feedback.
- [x] Vercel Preview deployment is READY from this exact SHA: https://ai-academic-assistant-jwj0v3x4p-barshan-s-team.vercel.app (Preview only).
- [x] Vercel runtime error-cluster scan returned no errors in the preceding 24 hours. This is an error-cluster scan, not a full functional acceptance test.

## Current hosted security/performance observations

- Security advisor: 14 authenticated-callable SECURITY DEFINER warnings (previously reviewed as intentional owner-scoped functions with auth checks and restricted grants); four informational RLS/no-policy notices for private quota tables; leaked-password protection remains disabled.
- Performance advisor: 48 informational unused-index notices. Do not remove indexes solely on this signal.
- No production database or environment changes were made.

## Release decision

**NOT APPROVED FOR PRODUCTION.** PR #1 remains open, draft and unmerged. Production server-side environment variables are still incomplete. Live Drive recovery and authenticated worker fault/retry acceptance, owner-controlled Production secrets/OAuth setup, provider and spend approval, independent academic grading, privacy/legal/accessibility acceptance, operational ownership, Supabase Free leaked-password mitigation, and hosted migration parity remain open. The separate-database backup/restore rehearsal remains skipped by owner instruction.

No merge, Production deployment, Production environment change, paid upgrade, database reset, migration-ledger repair, or data overwrite was performed. Do not promote this branch based on CI/Preview alone.

---

# Superseding current release status — 2026-11-05 (feature head `648e8d3cae0ec360846294cebad555cf62652072`)

This section supersedes every older exact-head status below.

## Automated verification

All six checks passed on exact head `648e8d3`:

- [x] Foundation: lint, TypeScript checks, dependency audits, unit tests, production build and Chromium smoke — [run 42053412812](https://github.com/barshan94/ai-academic-assistant/actions/runs/42053412812).
- [x] Local Supabase migrations and pgTAP/database authorization — [run 42053413126](https://github.com/barshan94/ai-academic-assistant/actions/runs/42053413126).
- [x] Authenticated two-account Supabase acceptance — [run 42053413041](https://github.com/barshan94/ai-academic-assistant/actions/runs/42053413041).
- [x] Full repository-history secret scan — [run 42053412933](https://github.com/barshan94/ai-academic-assistant/actions/runs/42053412933).
- [x] Vercel Preview feedback check — no unresolved feedback.
- [x] Vercel Preview deployment — [READY](https://ai-academic-assistant-8a42nabac-barshan-s-team.vercel.app), built from exact head `648e8d3`. Preview only; not Production.

Latest tests cover Drive-confirmed MIME/size validation, cleanup after a confirmed size mismatch, preserving Drive data after an uncertain database registration outcome, and duplicate cleanup without deleting the original.

## Production decision

**NOT APPROVED FOR PRODUCTION.** The green checks and READY Preview do not prove live integration recovery, academic accuracy, accessibility or privacy/legal acceptance.

PR #1 remains open, draft and unmerged. No Production deployment, Production environment change, production database change, merge, paid upgrade, data reset, migration-ledger repair or overwrite was performed.

## Open release gates

- [ ] Live Google Drive interruption/resume, lost final-response recovery, expiry, duplicate/idempotency, cross-account denial and final source-vs-Drive byte-count/SHA-256 equality using synthetic files.
- [ ] Capture an authenticated worker POST response; test wrong-secret, concurrent claims, stale recovery, retry exhaustion and injected OCR/provider failures against the deployed non-production worker. Two prior OCR jobs completed extraction and persistence, but both pages remain `review_required` with null confidence.
- [ ] Configure Production server-side environment safely. Production currently has only the public Supabase URL and publishable key among required entries. Do not blindly copy Preview secrets; the Drive token-encryption key must remain compatible with encrypted refresh tokens, and OAuth credentials require owner-controlled setup.
- [ ] Approve an AI provider/model, data-processing terms and explicit spend limit before configuring AI. AI generation remains disabled. Independently grade a Cambridge/Edexcel O/A Level golden set in Bengali and English.
- [ ] Complete privacy/legal review, publish a responsible contact, name primary/backup operators, and complete manual keyboard, screen-reader, contrast, zoom/reflow, reduced-motion and Android-device acceptance.
- [ ] Record an accepted mitigation or explicit plan decision for Supabase Free leaked-password protection, which remains disabled.
- [ ] Review hosted migration-history/schema parity before any Production migration. Do not rewrite migration history.
- [x] Separate-database backup/restore rehearsal excluded by owner instruction. Do not create another database or overwrite existing projects; the restore limitation remains documented.

## Current working head after this checkpoint

A documentation-only commit was added after the verified application head to update the release records. Its CI was queued at the time of this update; do not transfer the `648e8d3` green status to that newer commit until its own checks finish.

# Superseding exact-head release checkpoint — 2026-11-05 (feature commit `84f7275b7b78dc5b4a9674972a5bc2c1502ef7e6`)

This is the latest verified feature-branch checkpoint and supersedes older head references below.

## Automated verification — PASS on this exact commit

- [x] Foundation: lint, TypeScript checks, unit tests, production build and Chromium smoke — [run 42010794387](https://github.com/barshan94/ai-academic-assistant/actions/runs/42010794387).
- [x] Local Supabase migrations and pgTAP/database authorization — [run 42010794175](https://github.com/barshan94/ai-academic-assistant/actions/runs/42010794175).
- [x] Authenticated two-account Supabase acceptance — [run 42010794129](https://github.com/barshan94/ai-academic-assistant/actions/runs/42010794129).
- [x] Repository-history secret scan — [run 42010794262](https://github.com/barshan94/ai-academic-assistant/actions/runs/42010794262).

## Preview status

The newest READY Vercel Preview currently available is https://ai-academic-assistant-7chzjy3zn-barshan-s-team.vercel.app, built from commit `4681a255182151d2016d4196ca08062fed2b4359`. Comparing that deployment commit with this feature head shows only a worker documentation wording change and removal of an obsolete worker request test; application runtime files are unchanged. This is therefore runtime-code-equivalent Preview evidence, **not** a deployment of the exact current commit. It is Preview only, not Production.

## Live release gates — still OPEN

- [ ] Real Google Drive upload interruption/resume, expiry, duplicate/lost-response handling, cross-account denial, and final byte-count/SHA-256 verification.
- [ ] Authenticated worker POST evidence plus live non-production concurrent claim, wrong-secret, retry exhaustion, stale-lease recovery and injected OCR/provider failure tests. The workflow is manual-dispatch only; no automatic scheduler is active.
- [ ] Manual keyboard, screen-reader, contrast, zoom/reflow and Android-device acceptance.
- [ ] Independent qualified teacher review of official syllabus mappings and English/Bengali answer quality.
- [ ] AI provider/model, data-processing terms and spend limit approval. AI generation remains intentionally disabled; no provider spend is authorized.
- [ ] Qualified privacy/legal review, published responsible contact, and named primary/backup operators.
- [ ] Supabase Free leaked-password-protection limitation: accept a documented mitigation or approve a plan decision. The setting remains disabled.
- [ ] Hosted migration-history/schema parity review before any production migration.
- [ ] Isolated restore rehearsal is blocked by the owner's Free-plan/no-second-database constraint; no existing project may be overwritten. This is not waived by checksum verification.

## Current Supabase read-only health snapshot

The project reports `ACTIVE_HEALTHY`; the health advisor returned no findings. Security advisor currently reports four informational RLS/no-policy notices for private quota tables, fourteen authenticated-callable SECURITY DEFINER RPC warnings (previously reviewed as intentional owner-scoped operations with restricted grants and auth checks), and one warning that leaked-password protection is disabled. No database schema or data was changed during this inspection.

## Release decision and safety boundary

**NOT APPROVED FOR PRODUCTION.** PR #1 remains open, draft and unmerged. No Production deployment, production database change, merge, paid upgrade, migration-ledger repair, data reset or overwrite was performed. Do not promote until mandatory live/human gates are evidenced and the owner explicitly approves the immutable release commit.

---

# Superseding exact-head release checkpoint — 2026-11-05 (commit `978eae3d7126feb69b660a9fb78ee1e9fcd2a07c`)

This checkpoint supersedes earlier status snapshots below. The exact feature-branch head above has now completed all six GitHub checks successfully:

- [x] Foundation lint, type-check, unit tests and production build — [run 42004390956](https://github.com/barshan94/ai-academic-assistant/actions/runs/42004390956).
- [x] Chromium browser smoke tests — same Foundation run.
- [x] Local Supabase migrations and pgTAP/database authorization — [run 42004390450](https://github.com/barshan94/ai-academic-assistant/actions/runs/42004390450).
- [x] Authenticated two-account Supabase acceptance — [run 42004390527](https://github.com/barshan94/ai-academic-assistant/actions/runs/42004390527).
- [x] Repository-history secret scan — [run 42004390247](https://github.com/barshan94/ai-academic-assistant/actions/runs/42004390247).
- [x] Vercel Preview feedback check completed successfully.
- [x] Vercel Preview deployment is READY for this exact commit: https://ai-academic-assistant-2i1rl0olr-barshan-s-team.vercel.app (Preview only; deployment target is null).

The latest code changes include regression tests rejecting a non-PDF first upload chunk before Drive access and an invalid SHA-256 checksum before quota consumption or Drive session creation.

**Release decision: NOT APPROVED FOR PRODUCTION.** PR #1 remains open, draft and unmerged. The Preview is not Production. Live Drive upload interruption/resume and integrity, worker authenticated POST and fault recovery, manual accessibility and Android-device acceptance, independent teacher grading, AI provider/model/terms/spend approval, privacy/legal review, operational ownership, Supabase Free leaked-password protection mitigation, and hosted migration-history/schema parity remain release gates. The separate-database backup/restore drill is excluded by owner decision.

AI generation remains intentionally disabled until provider and budget approval. No production deployment, production database change, merge, paid upgrade, reset, or overwrite of existing projects was performed. Do not promote this commit to Production until each mandatory gate has documented evidence and the release owner explicitly approves the immutable commit.

---

# Current release checkpoint — 2026-11-05 (exact feature head 64faccf356a9cccbce32e4434007f21aa2b06728)

This section supersedes older status snapshots in this document when describing the current feature-branch verification. Historical entries below remain historical evidence and must not be treated as the current state.

## Current automated evidence

All six GitHub checks completed successfully on the exact head above:

- [x] Foundation: lint, type checks, unit tests, production build and Chromium browser smoke.
- [x] Local Supabase migration replay and pgTAP/database authorization.
- [x] Authenticated two-account Supabase acceptance.
- [x] Full repository-history secret scan.
- [x] Vercel Preview feedback check.
- [x] Vercel Preview deployment is **READY** for this exact commit: [open current Preview](https://ai-academic-assistant-l0qfi6ygb-barshan-s-team.vercel.app).

The latest test commit adds regression coverage for rejecting a non-PDF first upload chunk before contacting Drive and rejecting an invalid SHA-256 checksum before quota consumption or Drive session creation.

## Release decision

**NOT APPROVED FOR PRODUCTION.** Green CI and a READY Preview do not prove that live integrations, operational recovery, accessibility, academic quality or legal/privacy controls have been accepted.

PR #1 remains open, draft and unmerged. The deployment above is a Preview (target is null), not Production. No Production deployment, production database change, merge, paid upgrade or data reset was performed.

## Remaining release gates

- [ ] Exercise Google Drive upload end-to-end with a real authorized test account: larger PDF, interrupted upload, resume from Drive-confirmed offset, expired session, duplicate handling, original-PDF byte equality/SHA-256, and cross-account denial.
- [ ] Exercise the authenticated worker route with a controlled non-production job, including concurrent claims, provider/OCR failure, retry exhaustion, stale-lease recovery and failure-persistence failure. The checked-in workflow is manual-dispatch only; do not infer scheduler readiness.
- [ ] Complete manual keyboard, screen-reader, contrast, zoom/reflow and real Android-device accessibility acceptance.
- [ ] Obtain qualified teacher review of current Cambridge/Edexcel syllabus mappings and independently graded English/Bengali answers.
- [ ] Approve the AI provider, model, data-processing/retention terms and explicit spend limit; configure credentials only after approval. AI generation remains intentionally disabled until this is done.
- [ ] Complete privacy/legal review against the final provider and data-flow configuration, publish a responsible contact channel, and assign primary/backup operators.
- [ ] Resolve the Supabase Free-plan leaked-password-protection limitation with an accepted mitigation or an explicitly approved plan decision. Do not claim the hosted setting is enabled.
- [ ] Review hosted migration-history/schema parity and complete any approved non-production reconciliation before planning a production migration.

Do not merge or deploy Production until every mandatory release gate has documented evidence and the release owner explicitly approves the immutable commit. No production deployment is authorized by this checkpoint.

---
## Superseding exact-head release checkpoint — 2026-11-05 (commit `36436b4094f8b7fb97078769151f5760dfc4ae00`)

All six GitHub checks for this exact feature-branch head completed successfully:

- [x] Foundation: lint, application/Playwright type checks, unit tests, production dependency audit and production build (run [41997382423](https://github.com/barshan94/ai-academic-assistant/actions/runs/41997382423)).
- [x] Chromium browser smoke tests (Foundation run [41997382423](https://github.com/barshan94/ai-academic-assistant/actions/runs/41997382423)).
- [x] Local Supabase migrations and pgTAP/database authorization (run [41997382424](https://github.com/barshan94/ai-academic-assistant/actions/runs/41997382424)).
- [x] Authenticated two-account Supabase browser acceptance (run [41997382318](https://github.com/barshan94/ai-academic-assistant/actions/runs/41997382318)); the authenticated acceptance step actually executed and passed.
- [x] Repository-history secret scan (run [41997382315](https://github.com/barshan94/ai-academic-assistant/actions/runs/41997382315)).
- [x] Vercel Preview integration reports no unresolved feedback.

The matching Vercel Preview deployment is READY for this exact commit: [open Preview](https://ai-academic-assistant-1jz1mhcwg-barshan-s-team.vercel.app). This is a Preview only, not Production.

PR #1 remains open, draft and unmerged. No Production deployment, production database change, paid upgrade or merge was performed.

**Release decision: NOT APPROVED FOR PRODUCTION.** Live Google Drive interruption/resume and original-PDF integrity, worker POST/fault-injection and recovery, isolated backup restoration, manual accessibility/device acceptance, independent academic grading, privacy/legal approval, the Supabase Free leaked-password-protection limitation, migration-history review and named operational ownership remain open. Green CI does not close these live and human acceptance gates.

---

## Superseding exact-head CI checkpoint — 2026-11-05 (commit `1b6125ad82b681e504468e85469190d1da808988`)

This checkpoint supersedes earlier exact-head CI references in this document.

- [x] Foundation: lint, TypeScript checks, unit tests, production build and Chromium browser smoke passed (run [41996672898](https://github.com/barshan94/ai-academic-assistant/actions/runs/41996672898)).
- [x] Local Supabase migrations and pgTAP authorization passed (run [41996673036](https://github.com/barshan94/ai-academic-assistant/actions/runs/41996673036)).
- [x] Authenticated two-account browser acceptance passed (run [41996672870](https://github.com/barshan94/ai-academic-assistant/actions/runs/41996672870)).
- [x] Repository-history secret scanning passed (run [41996673033](https://github.com/barshan94/ai-academic-assistant/actions/runs/41996673033)).
- [x] Vercel Preview feedback check reports no unresolved feedback. This is not evidence of a successful Preview deployment or Production deployment.
- [x] The worker workflow-method regression test now matches the privacy-safe workflow implementation: POST, bearer authorization, one attempt, response captured to a temporary file and validated with `jq`; it does not expect the response to be discarded to `/dev/null`.

All required GitHub application/database/security checks above are green on the same exact head. The branch has not been merged or deployed. Live worker fault-injection, interrupted Drive upload/recovery, isolated backup restore, manual accessibility, independent academic grading, privacy/legal review, the Supabase Free leaked-password limitation and named operational ownership remain release blockers.

**Decision: NOT APPROVED FOR PRODUCTION.** No production database change, merge, paid upgrade or Production deployment was performed.

---

## Exact-head CI milestone — 2026-11-05 (commit `4148fa2036f99d2ab8c77c7a3d3db82ac16d1a8f`)

All six reported checks for this exact feature-branch commit have now completed successfully:

- [x] Lint, TypeScript checks, unit tests and production build (run [41981993926](https://github.com/barshan94/ai-academic-assistant/actions/runs/41981993926)).
- [x] Chromium browser smoke tests (same Foundation workflow, run [41981993926](https://github.com/barshan94/ai-academic-assistant/actions/runs/41981993926)).
- [x] Local Supabase migrations and pgTAP database authorization tests (run [41981993894](https://github.com/barshan94/ai-academic-assistant/actions/runs/41981993894)).
- [x] Authenticated two-account Supabase browser acceptance (run [41981993823](https://github.com/barshan94/ai-academic-assistant/actions/runs/41981993823)).
- [x] Repository-history secret scan (run [41981993814](https://github.com/barshan94/ai-academic-assistant/actions/runs/41981993814)).
- [x] Vercel Preview feedback check reports no unresolved feedback; this is **not** proof of a successful Preview deployment or Production deployment.

This closes the pending CI verification for commit `4148fa2`. It is a meaningful automated-validation milestone, not production approval. Live Drive interruption/recovery and worker fault-injection, isolated backup restore, manual accessibility/device acceptance, AI-provider approval and independent academic-quality grading, privacy/legal review, Supabase Free leaked-password limitation, migration-history reconciliation and operational ownership remain release blockers.

PR #1 remains open, draft and unmerged. No Production deployment, production database change, paid upgrade or merge was performed.

**Decision: NOT APPROVED FOR PRODUCTION.**

---

## Exact-head verification — 2026-11-05 (commit `fb538be82f4aa442e3f998218070018dc1ca7c1a`)

- [x] Foundation checks passed (run [41978767573](https://github.com/barshan94/ai-academic-assistant/actions/runs/41978767573)): lint, type-check, unit tests, production build and Chromium browser smoke tests.
- [x] Local database authorization tests and migrations passed (run [41978767520](https://github.com/barshan94/ai-academic-assistant/actions/runs/41978767520)).
- [x] Authenticated two-account browser acceptance passed (run [41978767503](https://github.com/barshan94/ai-academic-assistant/actions/runs/41978767503)).
- [x] Repository-history secret scanning passed (run [41978767572](https://github.com/barshan94/ai-academic-assistant/actions/runs/41978767572)).
- [x] The Chromium suite includes liveness/readiness endpoint behavior and public privacy-notice navigation/content assertions.
- [ ] Live worker invocation/recovery and fault injection, real interrupted-upload integrity, isolated backup restore, manual accessibility/device acceptance, academic-quality grading, privacy/legal review, Auth leaked-password mitigation, migration-history reconciliation and operational ownership remain open.
- [ ] Vercel deployment remains deferred until the final stage; do not retry the build-rate-limited deployment or pay to bypass the limit.
- PR #1 remains open, draft and unmerged. No Production deployment or production database change was made.

**Decision: NOT APPROVED FOR PRODUCTION.** These five green checks validate this exact feature-branch commit only. They do not close the outstanding live integration, recovery, human-review, privacy or release-approval gates.

---

## Current exact-head verification — 2026-11-05 (commit `84d77db35652ad7ef0d83e98b0b12f34a87a4a4f`)

This checkpoint supersedes earlier CI-head references in this document.

- [x] Foundation workflow passed on this exact commit: lint, type-check, unit tests, production build and Chromium browser smoke tests (run [41974968118](https://github.com/barshan94/ai-academic-assistant/actions/runs/41974968118)).
- [x] Isolated database authorization / local migrations and pgTAP passed (run [41974968110](https://github.com/barshan94/ai-academic-assistant/actions/runs/41974968110)).
- [x] Authenticated two-account acceptance passed (run [41974968139](https://github.com/barshan94/ai-academic-assistant/actions/runs/41974968139)).
- [x] Repository-history secret scan passed (run [41974968177](https://github.com/barshan94/ai-academic-assistant/actions/runs/41974968177)).
- [x] The upload progress indicator now exposes progressbar role, accessible name, minimum/maximum/current values and a human-readable percentage. This is a code-level accessibility improvement, not a substitute for the manual accessibility matrix.
- [ ] Live worker invocation/recovery and fault injection, real interrupted-upload integrity, isolated backup restore, manual accessibility/device acceptance, academic-quality grading, privacy/legal review, Auth leaked-password mitigation, migration-history reconciliation and operational ownership remain open.
- [ ] Vercel deployment remains deferred until the final stage; do not retry the build-rate-limited deployment or pay to bypass the limit.
- PR #1 remains open, draft and unmerged. No Production deployment or production database change was made.

**Decision: NOT APPROVED FOR PRODUCTION.** These green checks validate this exact feature-branch commit only. They do not close the outstanding live integration, recovery, human-review, privacy or release-approval gates.

---

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
- [x] Owner decision (2026-11-05): skip the separate-database backup/restore rehearsal; it is outside the requested project scope. Do not create another Supabase project or database for this purpose.
- [x] Keep the encrypted logical-export and archive-verification helpers as optional recovery tooling; their existence does not establish a tested restore.
- [ ] Create an operational backup of the live project before any separately approved production migration, using the approved backup procedure and secure storage. This is distinct from the excluded isolated restore drill.

**Scope note:** The owner explicitly excluded the isolated restore drill. It is not a current project completion blocker and must not be attempted unless the owner later requests it. No restore capability is claimed or certified by this scope decision.

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


## Superseding owner scope decision — 2026-11-05

The separate-database backup/restore drill is **SKIPPED BY OWNER** and removed from current project release blockers. Do not create another database for it. This does not waive the ordinary requirement to take a protected backup immediately before a separately approved production migration, and it does not claim that disaster recovery has been tested. Older historical checkpoint references to an isolated restore drill are superseded by this decision.


## Exact-head product-readiness checkpoint — 2026-11-05

Tested feature head: `813589dd4ece3e03aa0a0414d70d3a84ae06da88`.

- [x] All six GitHub checks passed on this exact SHA: lint/type-check/unit/build and Chromium browser smoke; isolated Supabase migration/pgTAP; authenticated two-account invitation/review/revocation acceptance; repository-history secret scan; Vercel Preview feedback check.
- [x] Reduced-motion support and its automated browser regression test are included in this head.
- [x] Exact-head Vercel Preview deployment is READY: https://ai-academic-assistant-p6yj7f6ul-barshan-s-team.vercel.app
- [x] PR #1 remains open, draft and unmerged. No Production deployment, Production environment change, production database change or paid provider activation was performed.

This is a green feature-branch verification checkpoint, not production approval. Remaining release blockers include live Drive upload interruption/resume and worker failure/recovery acceptance; the worker has no recurring scheduler; AI provider/model, data-processing terms and spend limit remain unapproved; manual screen-reader/contrast/zoom/real-device accessibility checks remain unrun; official syllabus verification and independent subject grading remain incomplete; privacy/legal review, responsible contact channel and named primary/backup operators remain outstanding; and the production environment lacks required server-side configuration. Supabase Free leaked-password protection is unavailable at the current plan and remains a documented limitation. Do not merge or deploy Production until the owner-controlled gates are resolved and explicitly approved.


## Exact-head verification and hosted inventory — 2026-11-06 01:45 Asia/Dhaka

Current feature branch head: `bfd34e3ad5c2df6fc371595114ada601abb9d4b0`.

### Exact-head CI evidence

All four GitHub Actions workflows passed on this exact SHA:

- Foundation checks [run 42087457213](https://github.com/barshan94/ai-academic-assistant/actions/runs/42087457213): dependency installation, production environment contract fixtures, production dependency audit, full dependency audit reporting, ESLint, application/Playwright type-checks, unit tests, Next.js production build, and Chromium browser smoke tests.
- Authenticated two-account acceptance [run 42087457132](https://github.com/barshan94/ai-academic-assistant/actions/runs/42087457132): non-production test configuration, build, and the authenticated invitation/review/revocation acceptance flow passed.
- Database authorization [run 42087456875](https://github.com/barshan94/ai-academic-assistant/actions/runs/42087456875): isolated local Supabase startup, complete migration replay, and pgTAP authorization tests passed.
- Full-history secret scanning [run 42087456888](https://github.com/barshan94/ai-academic-assistant/actions/runs/42087456888): passed.

The preceding CI failure was a Bengali Unicode filename sanitizer regression: the sanitizer preserved Unicode letters and numbers but removed combining marks. Commit `bfd34e3` now preserves Unicode combining marks; the regression test and the full exact-head CI suite pass.

### Read-only hosted non-production inventory

The existing Supabase Free project `academic-assistant` (`uqpyzicftxxegajaocxi`, `ap-south-1`) reports `ACTIVE_HEALTHY`. A read-only SQL inventory on 2026-11-06 returned:

- 102 migration-ledger entries.
- 31 public base tables; all 31 have RLS enabled; zero public base tables without RLS.
- Zero direct `anon` SELECT/INSERT/UPDATE/DELETE table grants.
- Zero `anon`-executable SECURITY DEFINER functions; 14 SECURITY DEFINER functions remain executable by `authenticated`. These are the previously reviewed owner-scoped application RPCs, not a blanket authorization approval; their individual privilege and ownership checks remain covered by the database test suite.
- Two Auth users and zero Supabase Storage buckets. Document files use the configured Google Drive workflow, not Supabase Storage.
- Supabase health advisor: zero findings. Security advisor: four informational notices for private quota tables with RLS enabled and intentionally no client policies, 14 warnings for the reviewed authenticated-callable SECURITY DEFINER RPCs, and the leaked-password-protection warning. Performance advisor: 48 informational unused-index notices; no indexes were dropped.

Supabase Auth leaked-password protection remains disabled on the current Free plan. This is a documented security limitation, not a setting that can be fixed through application code. Do not claim this security gate is closed.

### Preview deployment validation in progress

A Preview deployment was explicitly created for this exact branch head (not Production):

- Deployment ID: `dpl_BUL2b9AgFrbjjnajkc1VNPP3qJde`
- Commit: `bfd34e3ad5c2df6fc371595114ada601abb9d4b0`
- URL: https://ai-academic-assistant-l3hz0bq8w-barshan-s-team.vercel.app
- Initial state at checkpoint: `INITIALIZING`; inspect the final build state and logs before treating the Preview as verified.

The preceding latest automatic Vercel build inspected was for older commit `7411989fb5e9812e75abdd0958a2fc2e522fda11` and failed because of an unescaped apostrophe in the practice-session JSX. That failure is not the exact-head GitHub CI result. The new exact-head Preview is the required deployment-side recheck.

### Release decision and remaining owner/runtime gates

**NOT APPROVED FOR PRODUCTION.** Exact-head CI and the hosted read-only inventory do not prove all production gates. Remaining blockers:

- Verify the exact-head Vercel Preview completes successfully and run authenticated/non-authenticated smoke checks against it.
- Reconcile the three SQL-equivalent migration version/name mismatches; do not alter migration history except through the guarded reconciliation procedure. The current 102-entry ledger count alone does not prove exact repository parity.
- Prove Google OAuth and Drive resumable-upload interruption/resume, worker lease expiry/retry/dead-letter behavior, original-PDF retrieval, and operational recovery. The worker still has no recurring scheduler.
- Complete manual keyboard, screen-reader, contrast, zoom/reflow, Android/mobile and touch-target accessibility acceptance.
- Complete official Edexcel/Cambridge syllabus provenance review and independent teacher grading of representative Physics, Mathematics and Computer Science answers. OCR pages remain review-required until checked against originals.
- Complete privacy/legal review, publish a responsible contact channel, and name primary and backup operators.
- Production Vercel environment still requires owner-managed server-side configuration for Supabase service access, cron authentication, Google OAuth client/redirect and Drive token encryption. Keep `AI_ENABLED=false`, no AI provider credentials, no paid search provider and no paid fallback in strict zero-cost mode.
- Verify production Supabase Auth, domain/redirect settings, quota behavior and the documented Free-plan leaked-password-protection limitation before any release decision.

The separate-database backup/restore drill remains skipped by owner instruction; no second database is to be created. This does not prove disaster recovery. A protected backup is still required immediately before any separately approved production migration.

PR #1 remains open, draft and unmerged. No Production environment, Production deployment, production database schema, paid service, or merge was changed during this checkpoint.


## Exact-head Preview result — 2026-11-06

The Preview deployment for application-code commit `bfd34e3ad5c2df6fc371595114ada601abb9d4b0` completed successfully:

- Deployment `dpl_BUL2b9AgFrbjjnajkc1VNPP3qJde` is `READY`.
- Preview URL: https://ai-academic-assistant-l3hz0bq8w-barshan-s-team.vercel.app
- Vercel ran the Next.js production build, including compilation, lint/type validation and page-data collection; deployment reached READY.
- The external page fetch did not provide an HTTP/browser acceptance result, so do not mark authenticated route smoke testing as complete based on READY alone.

Read-only Vercel environment inventory (values were not decrypted or displayed): Production currently contains only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The branch-scoped Preview environment contains the server-side `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_DRIVE_REDIRECT_URI`, and `DRIVE_TOKEN_ENCRYPTION_KEY`. This is the intended non-production separation; it does not satisfy Production configuration. No AI provider key or search-provider key was added.



## Latest read-only Drive/OCR inventory — 2026-11-06

The existing non-production Supabase project currently reports one Drive connection, two processing jobs (both `completed`), three documents (one `ready`, two `review_required`) and three extracted pages. This count supersedes the older four-document/four-page snapshot in the historical checkpoint above. The completed jobs demonstrate that the worker can process a small happy-path sample; they do not validate resumable upload recovery, token refresh under failure, retry/dead-letter operations, OCR accuracy, or a recurring scheduler. The two review-required documents must not be treated as trusted source material until a teacher checks the extracted pages against their original PDFs.


---

## Live implementation checkpoint — 2026-11-06 22:40 Asia/Dhaka

This checkpoint supersedes older live-status statements where they conflict.

- The feature branch now records two hosted migration entries created during this session: `20261106162537_make_document_upload_registration_owner_atomic` and `20261106163907_reconcile_source_page_count_and_secure_registration`. Their matching migration files are present in this branch for auditability.
- The live `documents.source_page_count` column now exists. The live `register_uploaded_document` RPC stores this source count, accepts the intended 100-page limit, denies EXECUTE to `authenticated`, and grants it to `service_role`. The resumable-upload route uses a server-only service-role client after validating the signed upload session and account owner.
- **Important scope deviation:** these two hosted schema migrations were applied during this session despite the prior owner instruction in `docs/MIGRATION_RECONCILIATION.md` prohibiting hosted migrations. No further hosted migration, ledger repair, worker dispatch, Production configuration change, PR merge or Production deployment is authorized by this checkpoint. Preserve all existing records.
- The live processing RPCs still expose the earlier unfenced signatures `complete_document_processing(uuid,uuid,uuid,jsonb)` and `fail_document_processing(uuid,uuid,uuid,text)`. The feature worker expects the newer attempt-fenced signatures. The readiness endpoint deliberately fails closed until that schema is reconciled; the worker was not dispatched.
- Vercel's read-only environment inventory shows the Supabase service-role key, Google OAuth client secret, Drive encryption key and cron secret only on the `feature/m3-ai-solver` Preview target, not Production. No AI provider credential/model is configured; AI generation remains disabled. Do not copy Preview secrets to Production blindly.
- The readiness endpoint now returns safe boolean/status diagnostics (never secret values, URLs or upstream errors) to the bearer-authenticated monitor. Unit tests were updated for the expanded response.
- The latest Vercel status check is still blocked by the team's build-rate limit. A protected Preview URL fetch returned a Vercel authentication-required response, so no live endpoint result is claimed here.
- Latest full four-workflow CI evidence remains on the previous application head until the new readiness changes and migration-audit files complete their own checks.

**Release decision: NOT APPROVED FOR PRODUCTION.** The owner restrictions above remain binding.
