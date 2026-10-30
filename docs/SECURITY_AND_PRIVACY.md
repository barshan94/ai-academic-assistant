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
- Validate uploads by content type, file signature, size and page limits.
- Store files in the owner's Drive and keep only necessary metadata in the database.
- Encrypt OAuth refresh tokens at rest and restrict OAuth scopes to the required Drive access.
- Use CSRF-safe OAuth state, secure cookies, and strict redirect URI validation.
- Apply rate limits and bounded retries to costly AI and document-processing operations.

## Data lifecycle
- Do not delete original image/PDF data until conversion, readability checks and Drive upload are confirmed.
- Retain teacher corrections and version history.
- Provide a documented backup/export and recovery process.
- Avoid sending entire archives to AI providers; retrieve only the minimum relevant chunks.

## Public repository warning
Anyone can read source code and documentation. Public visibility does not expose secrets that were never committed, but any secret committed historically must be rotated immediately even if later deleted from Git history.
