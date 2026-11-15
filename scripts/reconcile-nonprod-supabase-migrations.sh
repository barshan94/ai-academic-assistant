#!/usr/bin/env bash
set -euo pipefail
set +x

# This legacy helper is intentionally disabled. It previously performed
# supabase migration repair before its dry-run, so even the operation labelled
# "dry-run" modified the hosted migration ledger. Do not restore executable
# migration commands here. Any future recovery plan must start with a separate,
# genuinely read-only inventory and receive explicit owner authorization.
echo "::error::Migration reconciliation is disabled. No Supabase CLI command or hosted operation was attempted." >&2
exit 1
