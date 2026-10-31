# Operations and Costs

## Initial cost policy
The owner selected Supabase Free only and explicitly prohibited upgrades or charges. Do not provision paid infrastructure or enable paid services without separate explicit approval.

## Supabase
The project is provisioned in the Barshan organization, Mumbai region (ap-south-1). Free-tier quotas and policies can change. Monitor database size, egress, auth usage and project inactivity. Never assume the free tier has unlimited capacity or uptime.

## Google Drive
Use the owner's account and available storage. Drive capacity is shared with Gmail and Google Photos. Respect API quotas and backoff responses.

## AI providers
AI inference and web search may incur charges even when the database and file archive are free. Do not enable paid AI APIs or search providers without explicit provider and budget approval. Optional Brave web research requires `BRAVE_SEARCH_API_KEY`, is limited to five searches per 15-minute window, and stores only result titles, HTTPS URLs, snippets, query text and provider-supplied publication dates. The question text and uploaded documents are not sent to the search provider. An optional `AI_PROVIDER_POOL` supports up to eight OpenAI-compatible endpoints with per-task capability flags and owner-defined priority. Fallback calls are disabled by default and require `AI_ALLOW_PROVIDER_FALLBACKS=true`; only configure fallback endpoints whose potential additional cost is approved. The router does not yet estimate token costs or dynamically score quality/latency.

## Reliability
Record job duration, retry count, provider/model, error class, document size, OCR confidence and verification status through a reviewed, redacted observability channel. Do not persist raw provider exceptions, upstream response bodies, tokens, source-page text or student content in job errors or user-facing diagnostics. AI answer generation is limited to five requests per 15-minute window and chapter-note generation to three per 15-minute window. New document upload sessions are limited to 10 per UTC hour and 50 per UTC day per owner. The worker handles at most one job per invocation and requires a bearer secret. Operational abuse monitoring and alerting still need setup. Provide backup/export guidance and recovery procedures.

## No-charge rule
Before enabling any external paid feature, confirm the expected cost and obtain explicit approval. If a service cannot operate within the approved free tier, pause and explain the limitation instead of silently upgrading.
