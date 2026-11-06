import { isProcessingJobStale } from "./processing-state";

export function isBackgroundJobRetryEligible(attemptCount: number, maxAttempts: number) {
  return Number.isInteger(attemptCount)
    && Number.isInteger(maxAttempts)
    && attemptCount >= 0
    && maxAttempts >= 1
    && attemptCount < maxAttempts;
}

export function isBackgroundJobClaimable(input: {
  status: string;
  startedAt?: string | null;
  now?: number;
}) {
  if (input.status === "queued" || input.status === "failed") return true;
  if (input.status === "running") return isProcessingJobStale(input.startedAt, input.now);
  return false;
}
