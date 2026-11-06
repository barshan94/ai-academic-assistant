import { describe, expect, it } from "vitest";
import { isBackgroundJobClaimable, isBackgroundJobRetryEligible } from "../lib/documents/worker-policy";

describe("document worker recovery policy", () => {
  const now = Date.parse("2026-10-31T12:00:00.000Z");

  it("claims queued and failed jobs but never terminal jobs", () => {
    expect(isBackgroundJobClaimable({ status: "queued", now })).toBe(true);
    expect(isBackgroundJobClaimable({ status: "failed", now })).toBe(true);
    expect(isBackgroundJobClaimable({ status: "completed", now })).toBe(false);
    expect(isBackgroundJobClaimable({ status: "cancelled", now })).toBe(false);
  });

  it("reclaims a running job only after the 15-minute lease expires", () => {
    expect(isBackgroundJobClaimable({
      status: "running",
      startedAt: "2026-10-31T11:45:00.000Z",
      now,
    })).toBe(true);
    expect(isBackgroundJobClaimable({
      status: "running",
      startedAt: "2026-10-31T11:45:00.001Z",
      now,
    })).toBe(false);
    expect(isBackgroundJobClaimable({
      status: "running",
      startedAt: "2026-10-31T12:01:00.000Z",
      now,
    })).toBe(false);
  });

  it("reclaims a running job with a missing lease timestamp but rejects malformed timestamps", () => {
    expect(isBackgroundJobClaimable({ status: "running", startedAt: null, now })).toBe(true);
    expect(isBackgroundJobClaimable({ status: "running", startedAt: "not-a-date", now })).toBe(false);
  });

  it("enforces an integer retry budget without allowing negative or fractional counters", () => {
    expect(isBackgroundJobRetryEligible(0, 3)).toBe(true);
    expect(isBackgroundJobRetryEligible(2, 3)).toBe(true);
    expect(isBackgroundJobRetryEligible(3, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(-1, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(1.5, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(0, 0)).toBe(false);
  });
});
