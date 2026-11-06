import { describe, expect, it } from "vitest";
import { isBackgroundJobClaimable, isBackgroundJobRetryEligible } from "./worker-policy";

describe("background worker policy", () => {
  it("permits attempts only while the configured retry budget remains", () => {
    expect(isBackgroundJobRetryEligible(0, 3)).toBe(true);
    expect(isBackgroundJobRetryEligible(2, 3)).toBe(true);
    expect(isBackgroundJobRetryEligible(3, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(1, 1)).toBe(false);
  });

  it("rejects invalid retry counters", () => {
    expect(isBackgroundJobRetryEligible(-1, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(1.5, 3)).toBe(false);
    expect(isBackgroundJobRetryEligible(0, 0)).toBe(false);
  });

  it("claims queued and failed jobs", () => {
    expect(isBackgroundJobClaimable({ status: "queued" })).toBe(true);
    expect(isBackgroundJobClaimable({ status: "failed" })).toBe(true);
  });

  it("claims only stale running jobs", () => {
    const now = Date.parse("2026-10-31T12:00:00.000Z");
    expect(isBackgroundJobClaimable({
      status: "running",
      startedAt: "2026-10-31T11:40:00.000Z",
      now,
    })).toBe(true);
    expect(isBackgroundJobClaimable({
      status: "running",
      startedAt: "2026-10-31T11:59:00.000Z",
      now,
    })).toBe(false);
    expect(isBackgroundJobClaimable({ status: "running", startedAt: null, now })).toBe(true);
  });

  it("never claims completed or cancelled jobs", () => {
    expect(isBackgroundJobClaimable({ status: "completed" })).toBe(false);
    expect(isBackgroundJobClaimable({ status: "cancelled" })).toBe(false);
  });
});
