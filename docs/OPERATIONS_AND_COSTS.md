# Operations and Costs

## Initial cost policy
The owner selected Supabase Free only and explicitly prohibited upgrades or charges. Do not provision paid infrastructure or enable paid services without separate explicit approval.

## Supabase
The project is provisioned in the Barshan organization, Mumbai region (ap-south-1). Free-tier quotas and policies can change. Monitor database size, egress, auth usage and project inactivity. Never assume the free tier has unlimited capacity or uptime.

## Google Drive
Use the owner's account and available storage. Drive capacity is shared with Gmail and Google Photos. Respect API quotas and backoff responses.

## AI providers
AI inference may incur charges even when the database and file archive are free. Do not enable paid AI APIs or send billable requests without explicit provider and budget approval. Build provider adapters and cost limits; show estimated/actual usage where available.

## Reliability
Record job duration, retry count, provider/model, error class, document size, OCR confidence and verification status. Avoid logging secrets or sensitive payloads. Provide backup/export guidance and recovery procedures.

## No-charge rule
Before enabling any external paid feature, confirm the expected cost and obtain explicit approval. If a service cannot operate within the approved free tier, pause and explain the limitation instead of silently upgrading.
