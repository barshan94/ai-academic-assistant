export const DEFAULT_STALE_PROCESSING_MS = 15 * 60 * 1000;

export function isProcessingJobStale(
  startedAt: string | null | undefined,
  now = Date.now(),
  staleAfterMs = DEFAULT_STALE_PROCESSING_MS,
): boolean {
  if (startedAt == null || startedAt.trim() === "") return true;
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(now) || staleAfterMs < 0) return false;
  const ageMs = now - startedAtMs;
  return ageMs >= staleAfterMs && ageMs >= 0;
}
