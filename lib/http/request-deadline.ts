export function getRemainingRequestTimeoutMs(
  perRequestLimitMs: number,
  deadlineAt?: number,
  now = Date.now(),
): number {
  if (!Number.isSafeInteger(perRequestLimitMs) || perRequestLimitMs < 1) {
    throw new RangeError("Per-request timeout must be a positive safe integer.");
  }
  if (deadlineAt === undefined) return perRequestLimitMs;
  if (!Number.isFinite(deadlineAt) || !Number.isFinite(now)) {
    throw new RangeError("Request deadline must be a finite timestamp.");
  }

  const remainingMs = Math.floor(deadlineAt - now);
  if (remainingMs < 1) throw new Error("REQUEST_DEADLINE_EXCEEDED");
  return Math.min(perRequestLimitMs, remainingMs);
}
