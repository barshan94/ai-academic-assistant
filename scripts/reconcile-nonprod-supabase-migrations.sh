#!/usr/bin/env bash
set -euo pipefail
set +x

readonly EXPECTED_PROJECT_REF="uqpyzicftxxegajaocxi"
readonly EXPECTED_CLI_VERSION="2.122.0"

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in your shell; do not commit it}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD in your shell; do not commit it}"

# Keep credentials in the process environment, never in the CLI argument list.
export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required. Install version ${EXPECTED_CLI_VERSION}." >&2
  exit 1
fi

actual_version="$(supabase --version | awk '{print $NF}')"
if [[ "$actual_version" != "$EXPECTED_CLI_VERSION" ]]; then
  echo "Expected Supabase CLI ${EXPECTED_CLI_VERSION}; found ${actual_version}." >&2
  exit 1
fi

echo "Target is fixed to the approved non-production project: ${EXPECTED_PROJECT_REF}"
supabase link --project-ref "$EXPECTED_PROJECT_REF"

echo "Current remote migration ledger:"
supabase migration list --linked

# These three pairs were verified read-only on 2026-11-04. Each remote
# statements[] array is SQL-equivalent to its repository file after removing
# SQL comments and normalizing whitespace. Repair history only; do not rerun DDL.
echo "Repairing only the three verified timestamp/name mismatches..."
supabase migration repair --linked --status reverted 20261103162903 20261104124726 20261104125214
supabase migration repair --linked --status applied 20261103163000 20261104100000 20261104110000

echo "Dry-running the full repository migration chain..."
supabase db push --linked --include-all --dry-run

echo
echo "The dry-run completed. This will apply repository migrations to the"
echo "approved non-production project only, if any are still pending."
echo "No reset or production deployment."
read -r -p "Type APPLY to continue: " confirmation
if [[ "$confirmation" != "APPLY" ]]; then
  echo "Stopped after dry-run. Migration history is reconciled; no pending DDL was applied."
  exit 0
fi

supabase db push --linked --include-all --yes

echo "Final remote migration ledger:"
supabase migration list --linked
