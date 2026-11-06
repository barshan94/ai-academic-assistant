import { describe, expect, it } from "vitest";
import { isProcessingJobStale } from "./processing-state";

describe("isProcessingJobStale", () => {
  const now = Date.parse("2026-10-31T12:00:00.000Z");

  it("treats a job older than the threshold as stale", () => {
    expect(isProcessingJobStale("2026-10-31T11:44:59.000Z", now)).toBe(true);
  });

  it("keeps a recently started job active", () => {
    expect(isProcessingJobStale("2026-10-31T11:50:01.000Z", now)).toBe(false);
  });

  it("treats a missing start time as stale so interrupted legacy jobs can recover", () => {
    expect(isProcessingJobStale(null, now)).toBe(true);
    expect(isProcessingJobStale(undefined, now)).toBe(true);
    expect(isProcessingJobStale("", now)).toBe(true);
  });

  it("does not classify invalid or future timestamps as stale", () => {
    expect(isProcessingJobStale("not-a-date", now)).toBe(false);
    expect(isProcessingJobStale("2026-10-31T12:01:00.000Z", now)).toBe(false);
  });

  it("supports a custom threshold", () => {
    expect(isProcessingJobStale("2026-10-31T11:59:00.000Z", now, 30_000)).toBe(true);
    expect(isProcessingJobStale("2026-10-31T11:59:45.000Z", now, 30_000)).toBe(false);
  });
});
