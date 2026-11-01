# Operations and Costs

## Initial cost policy
The owner selected Supabase Free only and explicitly prohibited upgrades or charges. Do not provision paid infrastructure or enable paid services without separate explicit approval.

## Supabase
The project is provisioned in the Barshan organization, Mumbai region (ap-south-1). Free-tier quotas and policies can change. Monitor database size, egress, auth usage and project inactivity. Never assume the free tier has unlimited capacity or uptime.

## Google Drive
Use the owner's account and available storage. Drive capacity is shared with Gmail and Google Photos. Respect API quotas and backoff responses.

## AI providers
AI inference and web search may incur charges even when the database and file archive are free. Do not enable paid AI APIs or search providers without explicit provider and budget approval. Optional Brave web research requires `BRAVE_SEARCH_API_KEY`, is limited to five searches per 15-minute window, and stores only result titles, HTTPS URLs, snippets, query text and provider-supplied publication dates. The question text and uploaded documents are not sent to the search provider. An optional `AI_PROVIDER_POOL` supports up to eight OpenAI-compatible endpoints with per-task capability flags and owner-defined priority. Fallback calls are disabled by default and require `AI_ALLOW_PROVIDER_FALLBACKS=true`; only configure fallback endpoints whose potential additional cost is approved. The router does not yet estimate token costs or dynamically score quality/latency.

## Health endpoints

- `GET /api/health` is a public liveness response. It confirms only that the Next.js process can serve a request; it does not check Supabase, Google Drive or AI-provider connectivity.
- `GET /api/health/ready` requires an `Authorization: Bearer <CRON_SECRET>` header. It returns only `ready` or `not_ready` and checks the presence/shape of the required Supabase, Google Drive encryption/OAuth and AI-provider configuration. It does not return missing variable names or secret values and does not perform live upstream calls.
- Keep the readiness endpoint's bearer secret in the monitoring system's secret store. A 200 response is a configuration check, not proof that credentials are accepted or that dependencies are reachable. Real dependency and authenticated workflow checks belong to the separate non-production acceptance phase.

## Reliability
Record job duration, retry count, provider/model, error class, document size, OCR confidence and verification status through a reviewed, redacted observability channel. Do not persist raw provider exceptions, upstream response bodies, tokens, source-page text or student content in job errors or user-facing diagnostics. AI answer generation is limited to five requests per 15-minute window and chapter-note generation to three per 15-minute window. New document upload sessions are limited to 10 per UTC hour and 50 per UTC day per owner. Optional Brave web research is limited to five searches per owner per 15-minute window and 20 per UTC day and sends only the manually entered query. The worker handles at most one job per invocation and requires a bearer secret. Allow-listed operational failure events are emitted as structured platform logs with only stable event names, route labels, safe error codes and optional job IDs; raw exceptions, queries, document text, credentials and user IDs are excluded. Google Drive OAuth configuration, token-exchange, scope-mismatch and connection-save failures are emitted as the redacted `google_drive_oauth_failed` event. Quota denials and quota-RPC outages are now emitted as distinct allow-listed events: `document_upload_quota_exhausted`, `document_upload_quota_unavailable`, `ai_generation_quota_exhausted`, `ai_generation_quota_unavailable`, `web_research_quota_exhausted` and `web_research_quota_unavailable`. These events contain only a stable route label and error code; they do not contain account IDs, submitted content or quota counters.

Recommended alert rules for the hosting platform (these are thresholds to configure, not active alerts):
- Any `*_quota_unavailable` event: page/notify an operator after 3 events in 5 minutes; a quota service outage fails closed and blocks the protected action.
- `document_worker_failed`: notify after 5 events in 15 minutes, and investigate any single job that repeatedly fails across its retry limit.
- `ai_generation_failed` or `web_research_failed`: notify after 10 events in 15 minutes; investigate provider availability and configuration without logging request content.
- `upload_session_start_failed`, `upload_chunk_failed` or `google_drive_oauth_failed`: notify after 5 events in 15 minutes.
- Review quota-exhausted events as abuse/cost signals, but do not page on a single expected user limit response.

Log retention, dashboards, alert thresholds and human on-call review still need setup. Encrypted logical-export tooling and a limited restore runbook exist, but full account-and-data recovery is not yet proven.

## No-charge rule
Before enabling any external paid feature, confirm the expected cost and obtain explicit approval. If a service cannot operate within the approved free tier, pause and explain the limitation instead of silently upgrading.
