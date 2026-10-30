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
- Validate PDF/JPEG/PNG file signatures, cap the current upload route at 4 MB, and use owner-derived IDs for database writes.
- Treat OCR output as unverified until the owner reviews and approves it.
- Use CSRF-safe OAuth state, secure cookies, and strict redirect URI validation.
- Apply rate limits and bounded retries to costly AI and document-processing operations.

## Data lifecycle
- Do not delete original image/PDF data until conversion, readability checks and Drive upload are confirmed.
- Retain teacher corrections and version history.
- Provide a documented backup/export and recovery process.
- Avoid sending entire archives to AI providers; retrieve only the minimum relevant chunks.

## Public repository warning
Anyone can read source code and documentation. Public visibility does not expose secrets that were never committed, but any secret committed historically must be rotated immediately even if later deleted from Git history.
