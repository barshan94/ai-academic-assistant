#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

fail() {
  printf 'Backup verification failed: %s\n' "$1" >&2
  exit 1
}

command -v age >/dev/null 2>&1 || fail "age is required."
command -v tar >/dev/null 2>&1 || fail "tar is required."
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || fail "sha256sum or shasum is required."

archive="\${1:-}"
[[ -n "$archive" && -f "$archive" ]] || fail "Usage: bash scripts/verify-backup.sh /absolute/path/to/archive.tar.gz.age"
: "\${AGE_IDENTITY_FILE:?Set AGE_IDENTITY_FILE to the separately stored age private identity file.}"
[[ -f "$AGE_IDENTITY_FILE" ]] || fail "AGE_IDENTITY_FILE does not exist."

workdir="$(mktemp -d "\${TMPDIR:-/tmp}/academic-assistant-verify.XXXXXX")"
cleanup() { rm -rf "$workdir"; }
trap cleanup EXIT

age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$workdir/backup.tar.gz" "$archive"
[[ -s "$workdir/backup.tar.gz" ]] || fail "Decrypted archive is empty."

entries="$(tar -tzf "$workdir/backup.tar.gz")"
expected=$'roles.sql\nschema.sql\ndata.sql\nauth-users.json\nmanifest.txt\nSHA256SUMS'
[[ "$entries" == "$expected" ]] || fail "Archive contents do not match the expected backup format."

# Stream each expected member to a newly created regular file. Do not extract
# archive-controlled paths or link metadata into the verification directory:
# a crafted tar can otherwise use symlinks/hardlinks to write outside it.
for file in roles.sql schema.sql data.sql auth-users.json manifest.txt SHA256SUMS; do
  tar -xOzf "$workdir/backup.tar.gz" "$file" > "$workdir/$file" || fail "Could not read archive entry: $file"
  [[ -s "$workdir/$file" ]] || fail "Archive entry is missing or empty: $file"
done

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$workdir" && sha256sum --check --status SHA256SUMS) || fail "SHA-256 checksum mismatch."
else
  (cd "$workdir" && shasum -a 256 --check SHA256SUMS) || fail "SHA-256 checksum mismatch."
fi

printf 'Backup archive decrypted and all included file checksums match.\n'
printf 'This confirms archive integrity only; it does not prove database restore, Auth Admin API account recreation or recovery of sessions/MFA/external identities/Storage.\n'
