# Incident response runbook

## Operating rules

- Treat academic documents, extracted text, questions, answers, OAuth tokens and account identifiers as sensitive.
- Do not paste secrets, raw provider responses, student content or database dumps into GitHub issues, workflow logs or chat.
- Preserve evidence before changing job states or deleting data.
- Do not use production as a test environment.
- If the scope or impact is uncertain, stop automated processing first and escalate to the owner.

## Severity guide

| Severity | Example | Immediate response |
|---|---|---|
| SEV-1 | Suspected account takeover, service-role/Google/AI secret exposure, cross-account data disclosure, destructive data loss | Stop affected workflows, revoke/rotate compromised credentials, preserve logs, notify owner immediately. |
| SEV-2 | Supabase unavailable, repeated worker backlog, Drive token decryption failure, quota RPC outage, widespread AI provider failure | Pause affected feature or worker, preserve jobs/data, inspect redacted diagnostics, restore only after cause is understood. |
| SEV-3 | Single document OCR failure, isolated provider timeout, expected quota exhaustion | Keep original Drive file, use bounded retry/manual correction, monitor recurrence. |

## Playbooks

### Worker backlog or repeated document failures
1. Disable the GitHub Actions document-worker schedule if it is causing repeated failed invocations.
2. Do not delete queued/running jobs or reset attempt counters manually.
3. Inspect redacted worker events and the affected job's status, attempt count, lease timestamp and safe error code through an authorized database session.
4. Check Supabase availability, Google Drive authorization, file existence and provider response limits.
5. Use the owner-authenticated manual processing action only after confirming the job is not actively leased by a worker.
6. Re-enable the schedule after a controlled non-production recovery confirms the failure cause is addressed.

### Supabase or quota-service outage
1. Expect upload, AI generation and web research admissions to fail closed when quota enforcement cannot be reached.
2. Do not bypass quota RPCs or grant broad table access as a workaround.
3. Check Supabase project status and bounded Data API connectivity.
4. Preserve queued work; resume after the database and migrations are reconciled.
5. Record the outage window and any requests users may need to retry.

### Google OAuth compromise or token failure
1. Disable the affected OAuth client or revoke the affected Google app grant as appropriate.
2. Rotate the Google client secret in the provider console and deployment environment; redeploy.
3. If refresh tokens may be compromised, revoke them and require the owner to reconnect.
4. If the Drive encryption key was lost, restore the exact original key from secure escrow. A new key cannot decrypt existing tokens.
5. Do not log or copy token values during diagnosis.

### AI provider outage or unexpected charges
1. Disable the affected provider or task configuration; do not silently switch to an unapproved paid fallback.
2. Keep `AI_ALLOW_PROVIDER_FALLBACKS=false` unless the owner approved the extra spend.
3. Review provider dashboard usage and the application's redacted failure/quota events.
4. Check whether source context or chapter notes were explicitly opted in before investigating a privacy concern.
5. Resume only after provider terms, price and task configuration are confirmed.

### Suspected data exposure or secret leak
1. Preserve the relevant GitHub Actions run URL, deployment ID, timestamp and safe event code.
2. Revoke/rotate the affected credential immediately: Supabase service-role, Google OAuth, AI provider, webhook or cron secret.
3. If the service-role key is exposed, assume RLS may have been bypassed; review database audit/logs for unauthorized reads/writes.
4. Restrict or disable the affected endpoint/workflow until the boundary is restored.
5. Identify data classes and accounts potentially affected; do not include raw student content in incident notes.
6. Record scope, containment, rotation, recovery and notification decisions.

### Drive encryption key lost
1. Stop Drive token refresh and connection operations.
2. Recover the exact key from the approved password manager/secure escrow.
3. If the original key cannot be recovered, stored encrypted refresh tokens are unrecoverable; revoke/reconnect Drive for the owner after reviewing impact.
4. Never overwrite the key and assume old tokens will decrypt.

## Incident record template

Record only non-sensitive operational metadata:
- Incident ID and severity.
- UTC start/end timestamps.
- Affected subsystem and deployment commit.
- Safe event/error codes and workflow run URL.
- Containment action and operator.
- Credential rotations/revocations performed (never record values).
- Data integrity and account impact assessment.
- Recovery steps and evidence.
- Follow-up corrective actions and owner.

## Known operational limitations

- GitHub Actions schedules are best-effort and are not guaranteed paging.
- Current structured logs are allow-listed but dedicated retention, dashboards and external paging still require configuration.
- Supabase Free has no automatic backup or point-in-time recovery.
- Current logical backups exclude Auth identities and Storage objects; complete owner identity/data recovery is not yet proven.
- Original PDFs live in user-owned Google Drive and are not included in the database backup.
