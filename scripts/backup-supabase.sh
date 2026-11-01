#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() {
  printf 'Backup failed: %s\n' "$1" >&2
  exit 1
}

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required."
command -v age >/dev/null 2>&1 || fail "age is required for encrypted backups."
command -v tar >/dev/null 2>&1 || fail "tar is required."
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || fail "sha256sum or shasum is required."

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL in the current shell; do not pass it as a command-line argument.}"
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to the age public recipient key.}"

if [[ ! "$BACKUP_AGE_RECIPIENT" =~ ^age1[0-9a-z]{20,}$ ]]; then
  fail "BACKUP_AGE_RECIPIENT does not look like an age public recipient."
fi

if [[ -n "${BACKUP_PROJECT_REF:-}" && ! "${BACKUP_PROJECT_REF}" =~ ^[a-z0-9-]{5,40}$ ]]; then
  fail "BACKUP_PROJECT_REF must contain only lowercase letters, digits and hyphens."
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
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
project_suffix="${BACKUP_PROJECT_REF:+-$BACKUP_PROJECT_REF}"
archive="$backup_root/academic-assistant-$timestamp$project_suffix-$.tar.gz.age"
[[ ! -e "$archive" ]] || fail "A backup archive already exists at the generated path."
workdir="$(mktemp -d "${TMPDIR:-/tmp}/academic-assistant-backup.XXXXXX")"
backup_complete=0
cleanup() {
  rm -rf "$workdir"
  if [[ "$backup_complete" -ne 1 ]]; then rm -f "$archive"; fi
}
trap cleanup EXIT

printf 'Exporting Supabase roles, schema and application data...\n'
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" --file "$workdir/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

for file in roles.sql schema.sql data.sql; do
  [[ -s "$workdir/$file" ]] || fail "Expected dump file is missing or empty: $file"
done

cli_version="$(supabase --version 2>/dev/null | tr '\n' ' ' | cut -c1-120)"
git_commit="$(git -C "${repo_root:-$PWD}" rev-parse HEAD 2>/dev/null || printf 'unknown')"
{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'project_ref=%s\n' "${BACKUP_PROJECT_REF:-unspecified}"
  printf 'supabase_cli=%s\n' "$cli_version"
  printf 'git_commit=%s\n' "$git_commit"
  printf 'backup_scope=roles,schema,application_data\n'
  printf 'excluded=auth_users,auth_configuration,storage_objects,project_settings,external_drive_files\n'
} > "$workdir/manifest.txt"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$workdir" && sha256sum roles.sql schema.sql data.sql manifest.txt > SHA256SUMS)
else
  (cd "$workdir" && shasum -a 256 roles.sql schema.sql data.sql manifest.txt > SHA256SUMS)
fi

tar -czf "$workdir/backup.tar.gz" -C "$workdir" roles.sql schema.sql data.sql manifest.txt SHA256SUMS
age --recipient "$BACKUP_AGE_RECIPIENT" --output "$archive" "$workdir/backup.tar.gz"
[[ -s "$archive" ]] || fail "Encrypted archive was not created."
chmod 600 "$archive"
backup_complete=1

printf 'Encrypted backup created: %s\n' "$archive"
printf 'Keep the matching age identity key separately. This archive excludes Auth users and Storage objects.\n'
