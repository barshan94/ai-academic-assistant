# Database, API and Security Boundary Review

- Review date: 2026-11-01
- Branch: `feature/m3-ai-solver`
- Reviewed revision before the remediation: `37439cc220d73ca632726a4e5561258c23d3eef0`
- Remediation commits are recorded in Git history after that revision.
- Review type: static source and migration review. No database was queried, no migration was applied, and no tests/build/type-check/CI were run.

## Executive result

One confirmed authorization-boundary defect was found and remediated: authenticated clients could directly execute `register_uploaded_document`. That allowed callers to manufacture document rows and processing jobs without passing through the upload route's quota admission and Google Drive completion checks.

The function is now executable only by `service_role`; the upload route first verifies the signed-in user, validates the owner-bound encrypted upload session, confirms Google's completed PDF metadata, and only then calls the RPC through a server-only service-role client.

This is a code-level fix, not a deployed fix. The new migration must be applied and its permissions tested in a disposable/non-production database before release.

## Surfaces reviewed

### API routes

- `app/api/cron/process-documents/route.ts`
- `app/api/documents/[id]/process/route.ts`
- `app/api/documents/upload/resumable/start/route.ts`
- `app/api/documents/upload/resumable/chunk/route.ts`
- `app/api/drive/connect/route.ts`
- `app/api/drive/callback/route.ts`
- `app/api/health/route.ts`
- `app/api/health/ready/route.ts`
- `middleware.ts`

### Supabase and security helpers

- `lib/supabase/env.ts`, `lib/supabase/server.ts`
- `lib/drive/crypto.ts`, `lib/drive/google.ts`
- `lib/documents/upload-limits.ts`, `lib/documents/resumable-upload.ts`
- `lib/security/ai-generation-quota.ts`
- SQL migrations defining application RPCs, trigger functions, RLS policies, grants, owner relationships, upload/AI/web-research quotas, practice/study features, teacher sharing/review, chapter notes, and syllabus catalogues.

## Confirmed issue and remediation

### SEC-001 — Publicly callable document registration RPC bypassed upload admission

**Risk:** An authenticated user could call `public.register_uploaded_document` directly with a caller-owned `owner_id`, a fabricated Drive file ID and metadata. The function checked caller ownership, but it did not prove the Drive file had completed the controlled resumable upload or that the upload quota had been consumed. It could create a queued document and processing job without the intended route controls.

**Remediation:**
- Added `supabase/migrations/20261101130000_restrict_document_registration_rpc.sql`.
- Replaced the RPC ACL: revoke execution from `PUBLIC`, `anon` and `authenticated`; grant execution only to `service_role`.
- Retained the owner check for ordinary invoker contexts and explicitly allow the trusted service-role execution context.
- Added `lib/supabase/service-role.ts`, marked `server-only`, with session persistence and token refresh disabled.
- Changed the completed-upload route to call the RPC with the server-only service-role client only after normal user authentication, encrypted-session owner matching, Google upload completion, PDF MIME type and byte-size checks.

**Expected boundary after migration:** Browser sessions cannot invoke the registration RPC. Only the server upload completion path can call it with the service-role credential.

**Verification status:** Source changes committed. Database migration application, role/ACL inspection, direct authenticated RPC denial, successful route registration and failure rollback tests remain pending the dedicated testing phase.

## Controls observed in the reviewed source

- User-facing document processing routes resolve the user with `auth.getUser()`, scope document/job/page reads by owner, and use owner-checked atomic RPCs for claim, completion, failure, correction and approval transitions.
- The scheduled worker uses a timing-safe `CRON_SECRET` comparison, a server-only service-role client, bounded provider responses/timeouts, owner-scoped record selection, and atomic job-claim RPCs.
- Resumable upload sessions are AES-256-GCM encrypted, short-lived, owner-bound, and restricted to Google API upload-session URLs; chunk bodies and offsets are bounded/validated.
- Google Drive refresh tokens are encrypted at rest. The callback checks OAuth state against a short-lived HTTP-only cookie and the currently authenticated owner; the requested/accepted scope is limited to `drive.file`.
- Readiness and liveness endpoints return generic status only; readiness is bearer-protected and uses bounded server-side dependency checks.
- The reviewed `SECURITY DEFINER` functions use an empty `search_path`, explicitly check `auth.uid()` for user-scoped operations, and have execution grants narrowed from `PUBLIC`/ `anon` where appropriate. The private teacher-review writer is separated from its public invoker wrapper.
- Owner-private tables reviewed use RLS and owner predicates; cross-owner document/page/question relationships use composite foreign keys. Teacher sharing is limited to the accepted invitation and question relationship.
- Syllabus owner and shared-reference catalogues have database lifecycle guards, monotonic status transitions, metadata protection, and draft-only taxonomy/evidence mutation.
- Quota functions serialize owner-scoped admissions and reject over-limit requests before incrementing counters.

## Remaining acceptance risks (not represented as fixed)

1. **The registration RPC migration is not applied.** Until it is applied, the old authenticated execute grant remains in the live database if that database has the earlier migration applied.
2. **No live role/ACL audit was performed.** The source migration chain is the evidence here; deployed grants, RLS enablement and Supabase advisors must be checked later.
3. **No live two-account teacher-sharing acceptance was performed.** Verify invitation acceptance, revocation races, teacher review, and cross-account invisibility using separate real test principals.
4. **No live Google OAuth/Drive acceptance was performed.** Verify state mismatch, reconnect without a new refresh token, session replay, chunk interruption, Drive 404/410 and cleanup.
5. **No CSRF, IDOR, quota-concurrency, replay, or direct-RPC penetration tests were run.** These belong in the separate testing phase.
6. **The readiness probe verifies configuration and Supabase Data API reachability, not Google Drive or AI provider reachability.** Do not treat a ready response as proof of those integrations.
7. **Service-role use remains a critical trust boundary.** Keep `lib/supabase/service-role.ts` server-only and never import it into client components, browser bundles, middleware, or user-controlled code paths.

## Testing phase checklist

- Confirm `authenticated` and `anon` receive permission denied on `register_uploaded_document`; confirm `service_role` can call it.
- Confirm the upload route cannot register until Google reports a completed PDF with matching size and the encrypted session owner matches the verified session user.
- Confirm a service-role RPC failure does not delete a Drive file when the database commit outcome is ambiguous.
- Enumerate all exposed `public` functions and effective execute grants; flag every `SECURITY DEFINER` function without explicit owner/role authorization.
- Enumerate every exposed-schema table/view and verify RLS, grants, policies, and view security-invoker behavior.
- Run two-account IDOR/RLS tests for documents, pages, questions, solutions, teacher invites/reviews, notes, syllabus catalogs, practice sets and study sessions.
- Run quota boundary and concurrency tests for uploads, AI generation and web research.
- Run OAuth state/session replay, CSRF origin, upload chunk size/range, session expiry and worker-secret tests.
- Run Supabase advisors and review any security findings before release.

## Decision

The confirmed source-level defect has been corrected in the feature branch. The overall security review is **not a security certification** and must not be marked fully accepted until the migration, database ACL/RLS checks, two-account acceptance and integration security tests pass in a non-production environment.
