#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_PROJECT_REF="uqpyzicftxxegajaocxi"
readonly EXPECTED_CLI_VERSION="2.122.0"

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in your shell; do not commit it}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD in your shell; do not commit it}"

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
supabase link --project-ref "$EXPECTED_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "Current remote migration ledger:"
supabase migration list --linked

echo "Repairing only the two byte-identical renamed migration entries..."
supabase migration repair --linked --status reverted 20261031031132 20261031031233
supabase migration repair --linked --status applied 20261031031012 20261031031212

echo "Dry-running the full pending chain, including out-of-order migrations..."
supabase db push --linked --include-all --dry-run

echo
echo "The dry-run completed. This will apply the repository migrations to the"
echo "approved non-production project only. No reset or production deployment."
read -r -p "Type APPLY to continue: " confirmation
if [[ "$confirmation" != "APPLY" ]]; then
  echo "Stopped after dry-run. The two migration-history pairs have been reconciled; no pending DDL was applied."
  exit 0
fi

supabase db push --linked --include-all --yes

echo "Final remote migration ledger:"
supabase migration list --linked
