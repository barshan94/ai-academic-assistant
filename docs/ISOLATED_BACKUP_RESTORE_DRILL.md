# Isolated backup and restore drill

Status: **SKIPPED BY OWNER — isolated backup/restore drill is outside the requested project scope.**

## Latest Free-plan inventory — 2026-11-05 (read-only)

The connected Supabase organization is on the **Free** plan and currently lists only two projects:

- `academic-assistant` (`uqpyzicftxxegajaocxi`) — active application/non-production project; preserve its data.
- `durga-map` (`iomikfkjawupfyppzamj`) — separate application; preserve its data.

Neither project is a safe restore target. No third isolated project was present in the organization inventory. Therefore the restore rehearsal is **blocked**, not passed. Do not pause, reset, repurpose, overwrite either project, create a paid resource, or attempt an in-place restore to force this gate closed. Recheck only if a genuinely isolated Free-plan target becomes available without affecting either existing project.

This read-only inventory did not create a project, change billing, modify either database, or access backup credentials.

## Free-plan safety preflight — mandatory

This drill must not consume a paid plan, overwrite an existing project, or put the current application data at risk.

- The current `academic-assistant` project is the source/non-production application and is not a restore target. Never restore over it.
- The separate `durga-map` project contains another application's data and is not a restore target. Do not pause, reset, repurpose or overwrite it.
- Before creating any target, inspect the Supabase organization for an already-available isolated Free-plan project slot. Do not upgrade, add billing, or create a paid resource. If no safe isolated target is available without affecting either existing project, mark the drill **BLOCKED / NOT RUN** and stop. That is safer than pretending an in-place restore is acceptable.
- The backup helper exports the selected source project's application data and supported Auth account hashes. Do not run it against a project containing real or private records for this drill. Use synthetic test records in a dedicated isolated source/target only.
- A successful archive checksum is not a restore. Do not mark this release gate complete until a separate target has accepted the restore and the original test identity has signed in.

This drill is an acceptance gate, not a claim that a backup has been restored. Run it only in an isolated, non-production Supabase project and a separate test Google account/Drive folder. Never paste passwords, service-role keys, OAuth secrets, encryption keys, backup files containing student data, or recovery codes into GitHub.

## Recovery assets and identity separation

Maintain these independently, in an approved password manager or offline secrets vault:

1. Supabase database backup/export and the matching migration history.
2. Supabase project URL and a newly issued recovery-only credential with minimum required privileges.
3. Google OAuth client configuration and a separately escrowed copy of the exact 32-byte `DRIVE_TOKEN_ENCRYPTION_KEY` used by the source environment.
4. The original user's sign-in identity and password recovery route, separate from the encryption-key custodian and database recovery credential.
5. Deployment configuration and the exact source commit/migration revision being restored.

The database backup does not contain the encryption key. Restoring encrypted Drive refresh-token rows without the original encryption identity will not restore the ability to use those tokens. Do not silently generate a replacement key and claim recovery succeeded. If the original key is unavailable, record the Drive connection as unrecoverable and require OAuth reconnection after the restored system is secured.

## Repository backup tooling

The repository currently provides:

- `bash scripts/backup-supabase.sh`: exports Supabase roles, schema and application data, plus a restricted JSON export of supported email/password Auth accounts; creates an encrypted `.tar.gz.age` archive outside the Git repository.
- `bash scripts/verify-backup.sh /absolute/path/to/archive.tar.gz.age`: decrypts with the separately held age identity and checks the archive member list and SHA-256 checksums. This is an integrity check, not a database restore.

The backup command requires Node.js, `supabase`, `age`, `psql`, `tar` and `sha256sum` (or `shasum`). Supply `SUPABASE_DB_URL`, `BACKUP_AGE_RECIPIENT` (the public recipient), and `BACKUP_PROJECT_REF` through the current shell's protected environment. Keep the matching age private identity in a separate secure location and set `AGE_IDENTITY_FILE` only when verifying. Never place either identity or database URL in command history or repository files.

Before encryption, the helper validates the entire Auth export against the restore importer's supported email/password account contract. If any active Auth account is outside that scope (including phone, MFA, SSO, anonymous, external provider or unsupported password hash), the backup fails closed instead of creating an archive that cannot complete Auth recovery.

The helper explicitly excludes Auth sessions/tokens, MFA factors, SSO and non-email external identities, Supabase Storage objects, project settings and external Drive files. The original PDF files remain in Google Drive. It exports email/password account hashes for a separate Auth Admin API recreation path; this is not the same as restoring managed Auth tables. Confirm the current importer implementation and supported hash compatibility before using it. Do not claim phone, MFA, SSO or session continuity.

## Drill procedure

### A. Prepare isolation

- Complete the Free-plan safety preflight above. Use only an already-available isolated Free-plan target; if none exists without disturbing existing projects, stop and record BLOCKED / NOT RUN.
- Use a separate test Google account and empty test Drive folder. Do not connect the production Drive account.
- Deploy the exact candidate commit and apply its forward-only migrations to the isolated project.
- Disable scheduled workers, outbound email, paid AI providers, web research and any production integrations.
- Record the operator, date/time, source backup identifier, source commit, migration version and target project reference in a private drill record. Do not put secrets in that record.

### B. Capture a recoverable backup

- Populate the isolated source with synthetic test records only: owner, question, answer, syllabus, teacher invitation/review, document metadata and job state records. Do not copy real student or private owner data into the drill.
- Run the repository helper `bash scripts/backup-supabase.sh` against that isolated source, using the protected environment-variable procedure in `docs/BACKUP_RESTORE.md`. Supabase Free does not provide automatic backups or point-in-time recovery; this is a manual logical export, not a provider snapshot.
- Run `bash scripts/verify-backup.sh` with the separately stored age identity. Record the archive checksum and timestamp. This verifies archive integrity only.
- Store the encrypted archive in the approved backup location, separate from the age private identity and the source database credentials.
- Separately verify that the encryption-key escrow item exists and that access is restricted to its designated custodian. Do not print or log the key.

### C. Restore to the isolated target

- Restore the backup into the isolated target using the provider-supported restore/import procedure. Never overwrite production.
- Confirm the expected schema, migration ledger, row counts and critical constraints.
- Confirm RLS is enabled on all user-owned tables and verify grants/RPC permissions against the migration definitions.
- Restore the exact original encryption key into the target's secret manager as a server-only secret. Do not store it in SQL, repository files, browser storage or CI logs.
- Configure a separate test deployment against the restored target. Verify all server secrets are scoped to that environment.

### D. Verify original-password sign-in and encrypted token use

- Using the original test user's existing email/password (not a newly created account), sign in through the normal application login page.
- Confirm the restored user ID matches the expected synthetic owner ID and that the session is established normally.
- Connect the test Google account before backup, then verify the restored encrypted refresh token can be decrypted and refreshed using the restored original encryption key. Do not expose token values.
- Verify owner-only data is visible to the owner and unavailable to a second unrelated test account.
- Verify teacher access remains question-scoped and revocation remains effective.
- Verify the document metadata and worker state are consistent. Do not run a worker until all external integrations are explicitly enabled for the isolated environment.

### E. Record outcome

The drill passes only if the restored database is usable, the original test identity signs in with its original password, RLS boundaries hold, and the original encryption identity can decrypt the restored test token. Record each result separately as PASS, FAIL or NOT RUN, with evidence references that contain no secrets.

Record elapsed recovery time and data-loss window. If any check fails, record the failure, stop, repair the procedure and repeat from a fresh isolated target. If the Free-plan safety preflight blocks the work, record the exact reason and leave every restore acceptance row as NOT RUN; do not downgrade the gate to a documentation-only pass.

## Acceptance record template

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Correct isolated target confirmed | NOT RUN | |
| Backup checksum and timestamp recorded | NOT RUN | |
| Schema, migrations, constraints restored | NOT RUN | |
| RLS and grants verified | NOT RUN | |
| Original encryption identity retrieved independently | NOT RUN | |
| Original test account signs in with original password | NOT RUN | |
| Restored encrypted test token decrypts/refreshes | NOT RUN | |
| Owner isolation and teacher scope verified | NOT RUN | |
| Recovery time and data-loss window recorded | NOT RUN | |

A written procedure, successful database import, or successful login with a newly created password is not a substitute for this complete drill.


## Scope decision — 2026-11-05

The project owner explicitly declined the separate-database backup/restore rehearsal and asked that this step be skipped. No additional Supabase project or database is to be created for this drill. This is a scope exclusion, **not a passed restore test** and not evidence of disaster-recovery capability. Keep the procedure as an optional future reference only; do not treat it as a current release blocker or attempt the drill unless the owner later asks to resume it.
