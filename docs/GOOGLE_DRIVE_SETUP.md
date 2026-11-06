# Google Drive OAuth and document archive setup

The app archives source PDFs in the owner's Google Drive. It uses the narrow `drive.file` OAuth scope and does not scan the user's entire Drive.

## Google Cloud setup

1. Create or select a Google Cloud project.
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen. While the app is in Testing, add the Google account that will own the archive as a test user. Google may expire refresh tokens after seven days while an external app remains in Testing mode.
4. Create an OAuth client ID with application type **Web application**.
5. Add these exact authorized redirect URIs:
   - Local: `http://localhost:3000/api/drive/callback`
   - Production: `https://YOUR-DEPLOYED-DOMAIN/api/drive/callback`
6. Copy the client ID and client secret into the server environment. Do not expose either in a `NEXT_PUBLIC_` variable.

## Environment variables

Add these to `.env.local` locally and to the deployment's server-side environment settings:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/drive/callback
DRIVE_TOKEN_ENCRYPTION_KEY=
```

Generate the encryption key with `openssl rand -base64 32`. On Windows PowerShell, use:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

The decoded value must be exactly 32 bytes. Keep the same key backed up securely. If it is lost or changed, the app cannot decrypt already-stored refresh tokens and the user must reconnect Google Drive.

Also configure the Supabase URL and publishable key as documented in `AUTHENTICATION_SETUP.md`.

## Current document workflow

1. Sign in to the private Academic Assistant account.
2. Open **Dashboard → Document library**.
3. Connect the Google account that should own the archive.
4. Upload one PDF, or select up to 50 JPEG/PNG images. The combined upload limit is 4 MB.
5. Existing PDFs are uploaded unchanged. Multiple images become one multi-page PDF in the order selected.
6. The app stores file metadata and the Drive file ID in Supabase.
7. Select **Extract text**. The app temporarily imports the archived PDF into Google Docs using Drive's conversion/OCR support, exports text, and deletes the temporary Google Doc.
8. Review and correct each extracted page. OCR output is not considered verified.
9. Select **Mark reviewed** only after checking the extracted text against the original in Drive.

The extraction route has a three-attempt limit and a 100-page extracted-text limit. Google Drive conversion and OCR behavior depends on the source document and Google's service availability. It is not a substitute for checking formulas, diagrams, tables, or symbols manually.

## Security behavior

- OAuth uses a random state value stored in a short-lived, HTTP-only, SameSite=Lax cookie and binds it to the signed-in owner.
- The refresh token is encrypted with AES-256-GCM before it is stored in the owner-scoped `drive_connections` table.
- Access tokens are refreshed server-side and never returned to the browser.
- Only `drive.file` scope is requested.
- Temporary Google Docs created for extraction are deleted after export.
- Supabase stores metadata, extracted text and review state; the original PDF remains in the user's Drive.
- A disconnect action attempts to revoke the Google refresh token and removes the local encrypted token.
- Resumable uploads above 4 MB and automatic background workers are not implemented. Processing is started explicitly from the document library.

## Troubleshooting

- **Drive credentials not configured:** check all four Google variables and redeploy/restart.
- **Redirect URI mismatch:** the URI in Google Cloud must exactly match `GOOGLE_DRIVE_REDIRECT_URI`, including scheme, host and path.
- **Missing refresh token:** remove the app from Google Account → Security → Third-party connections, then connect again with consent.
- **OCR failed:** open the source PDF in Drive and check whether it is readable. Password-protected, malformed, very large, or image-heavy PDFs may need manual handling.
- **Token decryption failed:** restore the original `DRIVE_TOKEN_ENCRYPTION_KEY`; otherwise reconnect Drive after removing the old connection.

Review Google's current OAuth verification and Drive API policies before making the app available to other users.
