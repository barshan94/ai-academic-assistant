type SafeOperationalEvent =
  | "document_worker_failed"
  | "document_processing_failed"
  | "upload_session_start_failed"
  | "upload_chunk_failed"
  | "ai_generation_failed"
  | "web_research_failed"
  | "document_upload_quota_unavailable"
  | "document_upload_quota_exhausted"
  | "ai_generation_quota_unavailable"
  | "ai_generation_quota_exhausted"
  | "web_research_quota_unavailable"
  | "web_research_quota_exhausted";

type SafeOperationalFields = {
  route?: string;
  errorCode?: string;
  jobId?: string;
  durationMs?: number;
  provider?: string;
};

function safeToken(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || !/^[a-zA-Z0-9._:/\-\[\]]+$/.test(normalized)) return undefined;
  return normalized;
}

/**
 * Emits only allow-listed operational metadata. Never pass exception objects,
 * messages, request bodies, queries, source text, user IDs or credentials.
 */
export function logSafeOperationalEvent(
  event: SafeOperationalEvent,
  fields: SafeOperationalFields = {},
) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    route: safeToken(fields.route, 100),
    errorCode: safeToken(fields.errorCode, 80),
    jobId: fields.jobId && /^[0-9a-f-]{36}$/i.test(fields.jobId) ? fields.jobId : undefined,
    durationMs: Number.isInteger(fields.durationMs) && (fields.durationMs ?? -1) >= 0
      ? Math.min(fields.durationMs ?? 0, 600_000)
      : undefined,
    provider: safeToken(fields.provider, 60),
  };
  const serialized = JSON.stringify(payload);
  if (event.endsWith("_exhausted")) {
    // Expected rate-limit responses are operational signals, not server faults.
    console.warn(serialized);
    return;
  }
  console.error(serialized);
}
