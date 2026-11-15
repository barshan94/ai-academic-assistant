#!/usr/bin/env bash
set -euo pipefail
set +x

# This legacy helper is intentionally disabled. Its former default path changed
# hosted migration history before running the schema preview, so the operation
# labelled "dry-run" was not read-only. Do not restore executable
# migration commands here. Any future recovery plan must start with a separate,
# genuinely read-only inventory and receive explicit owner authorization.
echo "::error::Migration reconciliation is disabled. No Supabase CLI command or hosted operation was attempted." >&2
exit 1
