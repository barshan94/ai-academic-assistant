#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() {
  printf 'Backup failed: %s\n' "$1" >&2
  exit 1
}

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required."
command -v age >/dev/null 2>&1 || fail "age is required for encrypted backups."
command -v psql >/dev/null 2>&1 || fail "psql is required to export supported Auth account records through a read-only query."
command -v node >/dev/null 2>&1 || fail "Node.js is required to validate the Auth account export."
command -v tar >/dev/null 2>&1 || fail "tar is required."
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || fail "sha256sum or shasum is required."

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in the current shell; do not put it in the script invocation.}"
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to the age public recipient key.}"
: "${BACKUP_PROJECT_REF:?Set BACKUP_PROJECT_REF to the source project reference for restore-target safety.}"

if [[ ! "$BACKUP_AGE_RECIPIENT" =~ ^age1[0-9a-z]{20,}$ ]]; then
  fail "BACKUP_AGE_RECIPIENT does not look like an age public recipient."
fi

if [[ ! "$BACKUP_PROJECT_REF" =~ ^[a-z0-9-]{5,40}$ ]]; then
  fail "BACKUP_PROJECT_REF must contain only lowercase letters, digits and hyphens."
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$repo_root" ]] || fail "Run this helper from the repository working tree."
repo_root="$(cd "$repo_root" && pwd -P)"
cd "$repo_root"
backup_root="${BACKUP_ROOT:-$HOME/academic-assistant-backups}"
mkdir -p "$backup_root"
chmod 700 "$backup_root"
backup_root="$(cd "$backup_root" && pwd -P)"

if [[ -n "$repo_root" ]]; then
  repo_root="$(cd "$repo_root" && pwd -P)"
  case "$backup_root/" in
    "$repo_root/"*) fail "BACKUP_ROOT must be outside the Git repository." ;;
  esac
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
project_suffix="-$BACKUP_PROJECT_REF"
archive="$backup_root/academic-assistant-$timestamp$project_suffix-$$.tar.gz.age"
encrypted_temp="$(mktemp "$backup_root/.academic-assistant-encrypted.XXXXXX")"
workdir="$(mktemp -d "${TMPDIR:-/tmp}/academic-assistant-backup.XXXXXX")"
archive_created=0
backup_complete=0
cleanup() {
  rm -rf "$workdir"
  rm -f "$encrypted_temp"
  if [[ "$archive_created" -eq 1 && "$backup_complete" -ne 1 ]]; then rm -f "$archive"; fi
}
trap cleanup EXIT
printf 'Exporting Supabase roles, schema and application data...\n'
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

auth_export_sql="$(cat <<'SQL'
select json_build_object(
  'formatVersion', 1,
  'projectRef', :'backup_project_ref',
  'users', coalesce(
    json_agg(
    json_build_object(
      'id', u.id::text,
      'aud', u.aud,
      'role', u.role,
      'email', u.email,
      'phone', nullif(u.phone, ''),
      'password_hash', nullif(u.encrypted_password, ''),
      'email_confirm', u.email_confirmed_at is not null,
      'phone_confirm', u.phone_confirmed_at is not null,
      'user_metadata', coalesce(u.raw_user_meta_data, '{}'::jsonb),
      'app_metadata', coalesce(u.raw_app_meta_data, '{}'::jsonb),
      'identity_providers', coalesce((
        select json_agg(distinct i.provider order by i.provider)
        from auth.identities as i
        where i.user_id = u.id
      ), '[]'::json),
      'mfa_factor_count', (
        select count(*)::integer
        from auth.mfa_factors as factor
        where factor.user_id = u.id
      ),
      'is_anonymous', coalesce((to_jsonb(u)->>'is_anonymous')::boolean, false),
      'is_sso_user', coalesce((to_jsonb(u)->>'is_sso_user')::boolean, false),
      'banned_until', to_jsonb(u)->>'banned_until'
    ) order by u.created_at
  ),
  '[]'::json
  )
)::text
from auth.users as u
where to_jsonb(u)->>'deleted_at' is null;
SQL
)"
# Supabase CLI logical dumps intentionally omit managed Auth tables. Export only
# account attributes that the Auth Admin API can recreate while preserving UUIDs.
# Sessions, MFA secrets and non-email identity providers are not supported by the restore importer.
printf '%s\n' "$auth_export_sql" > "$workdir/auth-export.sql"
psql "$SUPABASE_DB_URL" -X -q -A -t -v ON_ERROR_STOP=1 -v backup_project_ref="$BACKUP_PROJECT_REF" -f "$workdir/auth-export.sql" > "$workdir/auth-users.json"
rm -f "$workdir/auth-export.sql"
[[ -s "$workdir/auth-users.json" ]] || fail "Auth account export is missing or empty."

# Fail before archiving if any exported Auth row is outside the importer's
# supported, explicitly validated email/password account format. Never create
# an archive that looks restorable but will fail part-way through Auth recovery.
node --input-type=module - "$workdir/auth-users.json" <<'NODE'
import { readFile } from "node:fs/promises";
import { validateBackup } from "./scripts/restore-auth-users.mjs";

const backup = JSON.parse(await readFile(process.argv[2], "utf8"));
validateBackup(backup);
NODE

for file in roles.sql schema.sql data.sql auth-users.json; do
  [[ -s "$workdir/$file" ]] || fail "Expected dump file is missing or empty: $file"
done

cli_version="$(supabase --version 2>/dev/null | tr '\n' ' ' | cut -c1-120)"
git_commit="$(git -C "${repo_root:-$PWD}" rev-parse HEAD 2>/dev/null || printf 'unknown')"
{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'project_ref=%s\n' "$BACKUP_PROJECT_REF"
  printf 'supabase_cli=%s\n' "$cli_version"
  printf 'git_commit=%s\n' "$git_commit"
  printf 'backup_scope=roles,schema,application_data,email_password_auth_accounts\n'
  printf 'excluded=auth_sessions,auth_tokens,mfa_factors,external_oauth_identities,storage_objects,project_settings,external_drive_files\n'
} > "$workdir/manifest.txt"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$workdir" && sha256sum roles.sql schema.sql data.sql auth-users.json manifest.txt > SHA256SUMS)
else
  (cd "$workdir" && shasum -a 256 roles.sql schema.sql data.sql auth-users.json manifest.txt > SHA256SUMS)
fi

tar -czf "$workdir/backup.tar.gz" -C "$workdir" roles.sql schema.sql data.sql auth-users.json manifest.txt SHA256SUMS
age --recipient "$BACKUP_AGE_RECIPIENT" "$workdir/backup.tar.gz" > "$encrypted_temp"
[[ -s "$encrypted_temp" ]] || fail "Encrypted archive output is empty."
chmod 600 "$encrypted_temp"
mv -n "$encrypted_temp" "$archive"
if [[ -e "$encrypted_temp" ]]; then fail "A backup archive already exists at the generated path."; fi
archive_created=1
[[ -s "$archive" ]] || fail "Encrypted archive was not created."
backup_complete=1

printf 'Encrypted backup created: %s\n' "$archive"
printf 'Keep the matching age identity key separately. Supported email/password accounts can be recreated with the Auth Admin API; sessions, MFA factors, SSO and external identity providers, and Storage objects are not included.\n'
