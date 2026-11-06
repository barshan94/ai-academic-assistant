# Google Drive Storage Design

## Responsibility split
Google Drive stores original PDFs and validated image-derived PDFs. Supabase stores document metadata, Drive file IDs, checksums, ownership, processing status and academic knowledge. Do not use Supabase Storage as the permanent archive in the initial design.

## Upload flow
- User authorizes the app using Google OAuth.
- Server validates file and ownership.
- Image inputs follow the image-to-PDF policy; existing PDFs are preserved.
- Use Drive resumable uploads for larger files or unreliable mobile networks.
- Verify the resulting Drive file ID and metadata before marking the archive complete.
- Retain temporary originals until archive verification succeeds.

## OAuth security
Use server-side Authorization Code flow. Request the narrowest supported Drive scope. Store refresh tokens encrypted server-side, never in browser storage or source control. Validate OAuth state and exact redirect URIs. Provide disconnect/revoke handling.

## Quota and recovery
Google account storage is shared across Drive, Gmail and Photos and depends on available capacity. Handle quota errors without deleting source data. Persist upload state and Drive file IDs. Reconcile after partial failures to avoid duplicate uploads.
