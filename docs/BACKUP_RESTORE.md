# Backup and restore runbook

## Scope and hard limitations

This project is constrained to Supabase Free unless the owner explicitly approves a paid upgrade.

**Supabase Free does not include automatic database backups.** A manual logical export is required. The Free plan also does not provide point-in-time recovery. Recheck current plan documentation before relying on this runbook:
- https://supabase.com/kb/faqs/platform/free-plan-backups
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

A Supabase CLI logical dump is not a complete platform backup:
- The CLI excludes Supabase-managed `auth` and `storage` schemas by default. Do not claim this procedure backs up user identities or authentication configuration.
- Supabase Storage objects are not included. This app currently stores original PDFs in the owner's Google Drive rather than Supabase Storage; the Drive files must remain in Drive and are not copied by this database backup.
- Project settings, OAuth provider configuration, API keys, Edge Function secrets and external service configuration are not database data.
- The Drive token encryption key is required to decrypt the encrypted refresh tokens in the database. Losing it makes existing stored Drive connections unusable.
- Auth user UUIDs are referenced by owner-scoped application rows. Recreating accounts with new UUIDs is not a drop-in restore and can orphan application data. A complete account-and-data restore is **not yet proven on the Free plan**.

Therefore this runbook currently provides a manual export of application database schema/data and an isolated schema restore procedure. It is not a verified disaster-recovery guarantee.

## Backup procedure (manual, before risky changes and at least monthly)

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
4. Restore the schema/roles/data using the current official Supabase CLI restore procedure. For a blank target that is being reconstructed from the logical dump, the documented pattern is:

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$TARGET_DB_URL"
   ```

   Confirm exact command compatibility with the current Supabase restore guide before running. Do not use `supabase db reset --linked`; it is destructive.

5. **Stop before calling this a full restore.** The CLI dump does not contain Supabase Auth users. Public application rows have foreign keys to Auth identities. A supported method to restore the original user UUIDs and their account state must be established before attempting to restore real user data. Do not manually edit Supabase-managed Auth tables.
6. Reconfigure OAuth providers, redirect URLs, environment variables, cron secrets and deployment settings in the target. Reuse the exact Drive encryption key if encrypted refresh-token rows are restored.
7. Confirm that Google Drive files still exist in their original owner accounts. The app's database backup does not contain those file bytes.
8. Run the full local migration/pgTAP suite and a dedicated two-account authenticated acceptance suite against the isolated target before considering any migration.

## Restore acceptance checklist

- [ ] A backup archive is created, encrypted and stored in two independent locations.
- [ ] A fresh isolated target accepts the schema restore without manual untracked edits.
- [ ] A supported Auth identity restoration/reconciliation method is proven without editing managed Auth tables.
- [ ] Owner-linked application rows retain correct owner identity and cross-account isolation.
- [ ] Existing encrypted Drive tokens decrypt using the preserved encryption key.
- [ ] Drive file references resolve to files that still exist in the owners' Google Drives.
- [ ] Authenticated login, document processing, question/solution access, chapter notes and study workflows pass on the restored target.
- [ ] Restore duration and any unrecoverable data loss are recorded.

Until every required item above passes, backup/restore remains an open production-readiness item.
