# Backup and restore runbook

## Scope and hard limitations

This project is constrained to Supabase Free unless the owner explicitly approves a paid upgrade.

**Supabase Free does not include automatic database backups.** A manual logical export is required. The Free plan also does not provide point-in-time recovery. Recheck current plan documentation before relying on this runbook:
- https://supabase.com/kb/faqs/platform/free-plan-backups
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

A Supabase CLI logical dump is not a complete platform backup:
- The CLI excludes Supabase-managed `auth` and `storage` schemas by default. The repository backup helper now performs a separate read-only `psql` export of active email/password Auth accounts into `auth-users.json`, which is included in the encrypted archive.
- The Auth export contains the original UUID, email, supported password hash, email-confirmation state, audience/role and metadata. Phone-based accounts are deliberately rejected by the importer. `scripts/restore-auth-users.mjs` recreates supported accounts through the Supabase Auth Admin API, preserving the original UUIDs. Supabase documents custom user IDs and importing compatible bcrypt/Argon2 hashes in its [Auth0 migration guide](https://supabase.com/kb/guides/migrate-from-auth0).
- The Auth recovery workflow deliberately does **not** restore sessions/refresh tokens, MFA factors, SSO users or non-email identity providers. The importer rejects unsupported account types rather than silently losing their authentication methods. Users must sign in again after restore.
- Supabase Storage objects are not included. This app currently stores original PDFs in the owner's Google Drive rather than Supabase Storage; the Drive files must remain in Drive and are not copied by this database backup.
- Project settings, OAuth provider configuration, API keys, Edge Function secrets and external service configuration are not database data.
- The Drive token encryption key is required to decrypt the encrypted refresh tokens in the database. Losing it makes existing stored Drive connections unusable.
- Auth account recreation is now implemented as a source-level recovery path, but a complete account-and-data restore is **not yet proven** until the workflow succeeds on a fresh isolated Free-plan project and restored users can sign in with their original credentials.

This runbook now covers an encrypted application-data export plus a limited Auth account export/recreation path. It is still not a verified disaster-recovery guarantee until the full isolated restore drill succeeds.

## Backup procedure (manual, before risky changes and at least monthly)

A repository helper now automates the logical export and encrypts the result locally. It requires the Supabase CLI, `psql`, Docker/PostgreSQL tools as required by the CLI, and age installed on the trusted workstation. It does not upload the archive. The Supabase CLI receives the database connection URL as a child-process argument; run it only on a trusted single-user workstation because local process inspection by the same OS account may expose arguments. Use an encrypted local disk and a private temporary directory; deleting temporary files is not a guaranteed secure erase on SSDs.

1. Generate an age key pair on the trusted workstation and store the private identity in a separate secure location. For example, on Linux/macOS/WSL:
   ```bash
   umask 077
   mkdir -p "$HOME/.config/age"
   age-keygen -o "$HOME/.config/age/keys.txt"
   ```
   Copy the printed public `age1...` recipient into the backup environment variable; keep `keys.txt` private and backed up separately.
2. Set the database URL in the current shell using a hidden prompt (never place it in command history):
   ```bash
   read -rs SUPABASE_DB_URL
   export SUPABASE_DB_URL
   ```
3. Set the age public recipient and the required source Supabase project reference (used to prevent restoring Auth accounts back into the source project):
   ```bash
   export BACKUP_AGE_RECIPIENT='age1...'
   export BACKUP_PROJECT_REF='your-project-ref'
   ```
4. Run the helper from the repository:
   ```bash
   bash scripts/backup-supabase.sh
   ```
   The helper writes a mode-restricted encrypted `.tar.gz.age` archive under `$HOME/academic-assistant-backups` (or `BACKUP_ROOT`), refuses to place backups inside the Git working tree, creates role/schema/data dumps plus a supported Auth account export, writes a metadata manifest and SHA-256 checksums, and removes its temporary plaintext working directory on exit. Keep the private age identity separate from the archive.
5. Verify the encrypted archive on the trusted workstation before copying it off-site. Point `AGE_IDENTITY_FILE` to the separately stored private age identity and pass the archive path:
   ```bash
   export AGE_IDENTITY_FILE="$HOME/.config/age/keys.txt"
   bash scripts/verify-backup.sh "$HOME/academic-assistant-backups/academic-assistant-YYYYMMDDTHHMMSSZ-PID.tar.gz.age"
   ```
   This decrypts into a private temporary directory, accepts only the exact expected archive entries, streams each member into a newly created regular file (without extracting archive-controlled paths or link metadata), and verifies every SHA-256 checksum. It proves archive integrity, not successful database restoration.
6. Copy the encrypted archive to an independent off-site location. Never commit it to this repository.

The helper does not export Auth sessions, MFA factors, SSO/external provider identities, Storage object bytes, Google Drive files, project settings or provider secrets. Its output is not a complete disaster-recovery backup.

### Manual CLI export (alternative)

This CLI-only alternative does not create the separate `auth-users.json` payload and is not sufficient for the current account-recovery workflow. Prefer `scripts/backup-supabase.sh` for the current archive format.

1. Use a trusted workstation with the Supabase CLI and Docker installed.
2. Obtain the database connection string from the Supabase Dashboard's Connect panel. Do not paste it into chat, source code, shell history, or logs.
3. Set the connection string in a temporary environment variable in the current terminal session:

   ```bash
   read -s SUPABASE_DB_URL
   export SUPABASE_DB_URL
   ```

   Paste the connection string only into the hidden prompt, then press Enter. Avoid saving it in shell profiles.

4. Create a private backup directory outside the repository:

   ```bash
   mkdir -p "$HOME/academic-assistant-backups/$(date +%Y-%m-%d)"
   cd "$HOME/academic-assistant-backups/$(date +%Y-%m-%d)"
   ```

5. Export roles, schema and public application data:

   ```bash
   supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
   supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
   supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
   ```

6. Check that all three files exist and are non-empty. Record the date, project reference, CLI version, and dump exit status in a separate backup manifest. Do not record the connection string.
7. Encrypt the backup files using an established encrypted archive tool before moving them off-device. Store the decryption key separately. Keep at least one offline copy and one separate off-site copy. Never commit backup files to this public repository.
8. Preserve these operational secrets separately in an approved password manager:
   - `DRIVE_TOKEN_ENCRYPTION_KEY` (the exact existing key; do not rotate during restore)
   - Google OAuth client ID and client secret
   - Supabase project URL, publishable key and service-role key
   - `CRON_SECRET`
   - AI provider configuration, if enabled
   Do not put secret values in the manifest or backup archive's unencrypted notes.

## Restore rehearsal (isolated project only)

Do not test restore against production or the current shared project.

1. Create a separate non-production Supabase project. Do not delete or overwrite the source project.
2. Enable required extensions and confirm the target PostgreSQL/Supabase compatibility.
3. Review the repository's migrations and compare them with the target's migration history. This repository currently tracks a remote migration-history drift issue (ERR-007); do not run `supabase db push` blindly. Reconcile the target schema and migration ledger first.
4. Restore roles and schema only using the current official Supabase CLI restore procedure. For a blank target that is being reconstructed from the logical dump, use:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --dbname "$TARGET_DB_URL"
   ```

   Confirm exact command compatibility with the current Supabase restore guide before running. Do not use `supabase db reset --linked`; it is destructive.

5. Extract `auth-users.json` from the encrypted archive into a mode-restricted temporary file, then recreate supported email/password accounts through the Auth Admin API **before restoring application data**. For example:
   ```bash
   umask 077
   AUTH_USERS_BACKUP_FILE="$(mktemp)"
   age --decrypt --identity "$AGE_IDENTITY_FILE" "$BACKUP_ARCHIVE" | tar -xzOf - auth-users.json > "$AUTH_USERS_BACKUP_FILE"
   chmod 600 "$AUTH_USERS_BACKUP_FILE"
   export RESTORE_TARGET_PROJECT_REF="TARGET_PROJECT_REF"
   export SUPABASE_URL="https://${RESTORE_TARGET_PROJECT_REF}.supabase.co"
   export RESTORE_PASSWORD_HASH_ALGORITHM="bcrypt" # Use bcrypt or argon2 only after confirming the target Auth project uses the same algorithm as the source.
   export SUPABASE_SERVICE_ROLE_KEY
   node scripts/restore-auth-users.mjs "$AUTH_USERS_BACKUP_FILE"
   rm -f "$AUTH_USERS_BACKUP_FILE"
   ```
   The importer preserves original UUIDs, uses the exported password hashes and skips already-present matching UUID/email/email-provider accounts so an interrupted import can be resumed. Use it only on a dedicated otherwise-empty target; the Auth Admin API does not expose the existing password hash for comparison, so a matching pre-existing account's password cannot be independently verified by the importer. It refuses phone-based accounts, unsupported identity providers, MFA, anonymous and SSO accounts. Never print or paste the Auth JSON or service-role key.
6. Restore application data only after Auth users exist, so foreign keys to Auth identities can resolve:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$TARGET_DB_URL"
   ```
   Check the current Supabase restore guide for compatibility with the target Postgres version. Do not manually edit Supabase-managed Auth tables.
7. Reconfigure OAuth providers, redirect URLs, environment variables, cron secrets and deployment settings in the target. Reuse the exact Drive encryption key if encrypted refresh-token rows are restored.
8. Confirm that Google Drive files still exist in their original owner accounts. The app's database backup does not contain those file bytes.
9. Run the full local migration/pgTAP suite and a dedicated two-account authenticated acceptance suite against the isolated target before considering any migration.

## Restore acceptance checklist

- [ ] A backup archive is created, encrypted and stored in two independent locations.
- [ ] A fresh isolated target accepts the schema restore without manual untracked edits.
- [ ] The Auth Admin API importer recreates every supported original UUID and password hash; restored users can sign in with their existing passwords. Unsupported phone-based, MFA/SSO, anonymous and external identities are either separately recovered or explicitly accepted as a documented limitation.
- [ ] Owner-linked application rows retain correct owner identity and cross-account isolation.
- [ ] Existing encrypted Drive tokens decrypt using the preserved encryption key.
- [ ] Drive file references resolve to files that still exist in the owners' Google Drives.
- [ ] Authenticated login, document processing, question/solution access, chapter notes and study workflows pass on the restored target.
- [ ] Restore duration and any unrecoverable data loss are recorded.

Until every required item above passes, backup/restore remains an open production-readiness item.
