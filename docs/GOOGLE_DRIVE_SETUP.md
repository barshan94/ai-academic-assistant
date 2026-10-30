# Google Drive OAuth Setup

This is a setup guide for the app's own Google Drive API integration; it is not a ChatGPT connector.

## Setup outline
1. Create or select a Google Cloud project owned by the user.
2. Enable Google Drive API.
3. Configure the OAuth consent screen and test-user settings appropriate to the account.
4. Create OAuth client credentials for a web application.
5. Add exact local and production redirect URIs used by the app.
6. Store client ID and client secret only in server-side environment variables.
7. Implement Authorization Code flow with state validation and least-privilege Drive scopes.
8. Encrypt refresh tokens at rest and implement disconnect/revocation.
9. Test upload, resumable upload, metadata verification, quota errors and token refresh.

## Safety
Never commit OAuth client secrets or refresh tokens. Do not request broad Drive access unless the selected Drive API flow genuinely requires it. Review Google's current OAuth verification and restricted-scope requirements before production release.
