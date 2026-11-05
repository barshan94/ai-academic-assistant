# Release checkpoint — 2026-11-05

## Exact branch and commit

- Repository: `barshan94/ai-academic-assistant`
- Branch: `feature/m3-ai-solver`
- Pull request: #1 (draft, open, unmerged)
- Verified commit: `808542d57e14f6d13da21272647dd0ff4c4c1c6a`
- Production deployment: not performed; Production remains untouched.

This checkpoint supersedes earlier statements that the 2026-11-05 resumable-upload regression tests were still awaiting CI. The exact commit above has now completed all four required GitHub Actions workflows successfully.

## Verified CI results on this exact commit

| Workflow | Result | Evidence |
|---|---|---|
| Foundation checks | PASS | Lint, application/Playwright TypeScript checks, environment-contract validation, dependency audits, unit tests and production build completed successfully. |
| Chromium browser smoke | PASS | 10 passed, 2 skipped. The two credentialed cases are covered by the separate authenticated workflow below. |
| Database authorization | PASS | Fresh isolated local Supabase database; all 12 pgTAP files passed, 256 assertions total. |
| Authenticated browser acceptance | PASS | Two dedicated non-production accounts; 2 Playwright tests passed: owner document/page review and source-linked question flow; teacher invitation, review and revocation lifecycle. |
| Secret scanning | PASS | Full repository history and working tree scan completed successfully. |

The authenticated browser workflow used masked non-production Supabase credentials. Its success is evidence for the exercised owner/teacher flows, not proof that every feature or integration has been accepted.

## Resumable Google Drive upload coverage now verified

On this exact commit, Foundation CI includes the new upload-recovery implementation and tests. The covered behaviors include:

- Resume asks Google Drive for its authoritative accepted-byte offset before sending more data.
- A missing, invalid, out-of-range or inconsistent offset is rejected.
- The client refuses to proceed when Drive confirms no forward progress.
- The reported offset cannot move beyond the chunk just sent.
- Completion is accepted only when the full source-file length is confirmed.
- Status queries send no chunk body.
- Route tests reject cross-origin requests, unauthenticated starts, cross-account sessions and malformed byte ranges before sensitive Drive/service-role work.

These are automated tests with mocked Drive responses. They do **not** replace the real Google Drive interruption/recovery acceptance test.

## Vercel status

The Vercel status for this commit reports a build-rate-limit failure with a Vercel upgrade prompt. This is a provider account/plan limit, not a failing application assertion. No paid upgrade is approved or required for the code changes in this checkpoint. A usable Preview deployment for this exact commit is therefore not confirmed by this status.

## Release blockers still open

1. **Live Drive recovery:** use a synthetic multi-chunk PDF in a non-production account; interrupt after an accepted chunk, reload/reselect, verify Drive-confirmed resume, then compare final byte count and SHA-256. Also test a lost final-chunk response, expired session and cross-account rejection.
2. **Document worker:** activate and exercise the worker against a non-production deployment/database; prove successful OCR/page persistence, wrong-secret rejection, atomic claims, retry exhaustion and stale-job recovery. A queued job or route smoke test is not successful OCR acceptance.
3. **AI provider:** no provider/model and spend approval are configured. Keep generation disabled until the owner chooses a provider and explicitly approves any possible charges. Then validate output quality and failure handling.
4. **Academic quality:** independently grade a representative Cambridge/Edexcel O/A Level golden set across supported subjects, including Bengali and English explanations, calculations, citations and mark-scheme alignment.
5. **Backup/restore:** archive checksums are not a restore rehearsal. Establish a genuinely isolated free-plan target and prove a synthetic backup can be restored without touching this project or the separate Durga Map project.
6. **Security/account settings:** Supabase leaked-password protection is unavailable on the current Free plan. Record the limitation and mitigations; do not imply this setting is enabled.
7. **Privacy/accessibility/product acceptance:** finish privacy/legal review, keyboard/screen-reader/contrast/reduced-motion acceptance, mobile device checks, public product-status review and private-cache/account-switching checks.
8. **Operations:** name primary and backup operators and verify incident/recovery procedures.

## Safety decisions

- Keep PR #1 draft and unmerged.
- Do not deploy Production.
- Do not dispatch the migration-history reconciliation workflow or rewrite the hosted migration ledger.
- Do not reset, overwrite or delete existing Supabase data.
- Do not buy a paid plan or enable paid AI usage.
- Use synthetic data for remaining acceptance tests; never use real student documents.

**Conclusion:** the exact latest feature-branch commit is green across GitHub CI, database authorization, authenticated owner/teacher browser acceptance and secret scanning. The project is not production-ready because several live integration, recovery, academic-quality, privacy and operational gates remain unverified.
