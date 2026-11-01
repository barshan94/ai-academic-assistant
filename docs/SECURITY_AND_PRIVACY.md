# Security and Privacy

## Repository visibility
This repository is public by explicit owner choice. Never commit:
- Supabase service-role keys or database passwords.
- Google OAuth client secrets, access tokens or refresh tokens.
- AI provider API keys.
- Real student records, private exam materials not licensed for redistribution, or personal documents.
- Production environment files.

Use .env.local for local secrets and keep it ignored by Git. Commit only placeholder variable names in .env.example.

## Application security
- Require authentication for all application data routes.
- Enforce Row Level Security on every user-owned table.
- Derive owner identity from the verified server-side session; never trust a user_id supplied by the browser.
- Keep service-role credentials server-only and use least privilege.
- Revoke broad default table grants from anon and authenticated. Authenticated receives only SELECT/INSERT/UPDATE on profiles and SELECT/INSERT/UPDATE/DELETE on owner-scoped application tables. TRUNCATE, REFERENCES and TRIGGER are not granted.
- Revoke broad default table privileges for future tables created by the postgres migration role; each migration must explicitly grant only what its feature requires. Supabase's provider-managed supabase_admin default ACL remains unchanged, so do not create application tables under that role without separately auditing and revoking grants.
- Use composite foreign keys so document pages, processing jobs and questions cannot reference a parent document owned by another user.
- Validate uploads by content type, file signature, size and page limits.
- Store files in the owner's Drive and keep only necessary metadata in the database.
- Encrypt Google Drive OAuth refresh tokens with AES-256-GCM at rest and restrict OAuth scopes to drive.file.
- Bind OAuth state to the signed-in owner, use a short-lived HTTP-only SameSite cookie, and never return access tokens to the browser.
- Validate PDF/JPEG/PNG file signatures, normalize uploads to a 50 MB maximum, transfer in resumable 1 MB chunks, and use owner-derived IDs for database writes.
- Treat OCR output as unverified until the owner reviews and approves it.
- Use CSRF-safe OAuth state, secure cookies, and strict redirect URI validation.
- Apply bounded input sizes, request timeouts and bounded retries to AI and document-processing operations. AI answer and chapter-note generation use atomic owner-scoped database quotas. New document-upload sessions are limited atomically to 10 per UTC hour and 50 per UTC day per owner; worker invocation remains protected by a shared secret and one-job-per-invocation claim. Abuse monitoring and operational acceptance remain outstanding. Provider error bodies and document-processing exceptions are redacted from persisted job metadata and user-facing upload/worker responses. Structured operational logs use an allow-list of event, route, stable error code and optional job ID; exception objects, messages, stacks, request content, search queries, user IDs and credentials are not accepted by the logger. Quota exhaustion and quota-service outages have separate allow-listed event names for uploads, AI generation and web research; the logs intentionally omit account IDs and quota counters. Google Drive OAuth configuration, token-exchange, scope-mismatch and persistence failures use one redacted operational event with stable error codes.
- The completed-upload registration RPC is server-only: authenticated clients cannot execute it directly. The resumable upload route verifies the session owner and Google completion metadata before using the server-only service-role client. See `docs/SECURITY_BOUNDARY_AUDIT.md`; its ACL migration is committed but not yet applied to a hosted database.
- Route-level and root-level error boundaries show generic messages only; they do not render exception messages, stacks, provider response bodies or submitted academic content. They warn that a failed action may not have been saved.

## Browser response protections
- Disable framework fingerprinting and set HSTS, frame denial, MIME-sniffing protection, a strict referrer policy and a restrictive Permissions-Policy. These headers are covered by a Chromium smoke test.
- GitHub Actions dependencies are pinned to immutable commit SHAs rather than movable major-version tags; the Supabase CLI binary is version-pinned, and checkout credentials are not persisted by read-only workflows. The one-time migration-generation workflow that required repository write permission was removed after its migration task was completed.
- The public liveness endpoint returns no environment or dependency details. The readiness endpoint requires a timing-safe bearer comparison against `CRON_SECRET` and returns only a generic ready/not-ready status; it validates canonical encoding for the 32-byte Drive encryption key, checks that AI providers are configured for both answer and chapter-note tasks, and performs a bounded server-only Supabase Data API query without returning database content. It never lists missing variables or returns secret values. The check does not prove Google Drive or AI provider connectivity.
- A nonce-based Content Security Policy is enforced by middleware on application pages and API routes. It uses a per-request script nonce, restricts object/frame/base/form sources, and allows only the required Supabase/Google origins plus the configured HTTPS AI provider origin for connections. Development-only eval and localhost connections are scoped to non-production. The root layout forces dynamic rendering so pre-rendered HTML cannot contain inline Next.js scripts without the request nonce. The shared layout also provides a keyboard skip link, visible focus indicators and minimum mobile touch targets; accessibility acceptance remains outstanding. Browser acceptance must still confirm Next.js script hydration, Supabase auth refresh, Google OAuth redirects, custom provider configuration and CSP violation behavior.

## Data lifecycle
- Do not delete original image/PDF data until conversion, readability checks and Drive upload are confirmed.
- Retain teacher corrections and version history.
- Backup/export and recovery guidance must be completed and a restore drill must be performed before release; do not claim recovery readiness from documentation alone.
- Avoid sending entire archives to AI providers; retrieve only the minimum relevant chunks.
- Web research is owner-initiated and sends only the manually entered search query to the configured search provider; question text and uploaded documents are not sent automatically. Search result snippets and URLs are stored in an owner-private append-only table and remain unverified source leads, not official curriculum evidence.
- Approved chapter-note retrieval is separately opt-in. Only up to three immutable note versions owned by the question owner and linked to the question's exact confirmed syllabus chapter are sent to the AI provider. The note IDs, versions and titles are stored with the answer; the note text is not copied into the answer record.
- Source-page text is excluded from AI requests by default. Only the question owner can explicitly opt in to sharing the single linked page; the excerpt is trimmed to 8,000 characters and OCR/extraction uncertainty is disclosed.
- Saved answer provenance stores document/page identifiers, extraction method, excerpt hash and length, but not the source excerpt. A database trigger checks that the recorded page/document belongs to the same owner and question; teacher accounts cannot read the original document page.

## User-facing privacy disclosure

The current application publishes `/privacy`, linked from the landing page and sign-in screen. It explains the current Supabase, Google Drive, optional AI and web-research data flows, authentication/time-zone cookies, retention limitations and the absence of a complete self-service account/data deletion workflow. This is an implementation disclosure, not legal approval. Before inviting additional users, review it against the final deployed provider configuration and retention settings, add a responsible contact channel, and complete applicable legal/accessibility review.

## Search indexing and private routes

The app publishes crawler rules that disallow `/dashboard/`, `/api/` and `/login`, while allowing the public landing page and privacy notice. Middleware also emits `X-Robots-Tag: noindex, nofollow, noarchive` for dashboard, API and sign-in responses, including authentication redirects. These directives are defense-in-depth only: robots rules are public and are not access controls. Authentication and row-level authorization remain the confidentiality boundary. Already indexed URLs may remain visible until search engines recrawl or are explicitly asked to remove them.

## Public repository warning
Anyone can read source code and documentation. Public visibility does not expose secrets that were never committed, but any secret committed historically must be rotated immediately even if later deleted from Git history.

## Dependency audit
- CI gates the production dependency tree with `npm audit --omit=dev`; the production dependency audit must pass.
- The newly disclosed minimatch glob-amplification advisory affects versions before 11.0.1. The `@typescript-eslint/typescript-estree` development dependency is pinned through an npm override to patched minimatch 11.x.
- ESLint's current legacy development dependency chain still uses minimatch 3.x's default-export API; forcing minimatch 11 globally breaks ESLint at runtime. That dev-only legacy copy remains visible to a full `npm audit` report and is not represented as fixed. Revisit it when the ESLint/Next compatibility chain can move to a patched compatible release.


- Private dashboard and API paths receive `Cache-Control: private, no-store` at middleware entry, before authentication branching. This includes dashboard redirects and prevents shared/browser caches from retaining private workspace/API responses; route-level data authorization remains mandatory.


Middleware response recreation: when Supabase refreshes auth cookies, the replacement response explicitly inherits the existing `Cache-Control`, `Expires`, `Pragma`, CSP and `X-Robots-Tag` policy headers. This prevents cookie refresh from silently dropping private-response or crawler directives (ERR-121); verify in the browser acceptance phase.
