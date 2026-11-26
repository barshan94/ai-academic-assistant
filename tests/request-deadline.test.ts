import { describe, expect, it } from "vitest";
import { getRemainingRequestTimeoutMs } from "@/lib/http/request-deadline";

describe("shared request deadline", () => {
  it("keeps the per-request cap when no overall deadline is supplied", () => {
    expect(getRemainingRequestTimeoutMs(15_000, undefined, 10_000)).toBe(15_000);
  });

  it("caps a request to the remaining wall-clock budget", () => {
    expect(getRemainingRequestTimeoutMs(15_000, 12_500, 10_000)).toBe(2_500);
    expect(getRemainingRequestTimeoutMs(5_000, 30_000, 10_000)).toBe(5_000);
  });

  it("rounds a positive fractional remainder down to whole milliseconds", () => {
    expect(getRemainingRequestTimeoutMs(5_000, 10_001.9, 10_000)).toBe(1);
  });

  it("fails before starting a request after the shared deadline expires", () => {
    expect(() => getRemainingRequestTimeoutMs(15_000, 9_999, 10_000))
      .toThrow("REQUEST_DEADLINE_EXCEEDED");
  });

  it("rejects invalid timeout limits and non-finite deadlines", () => {
    expect(() => getRemainingRequestTimeoutMs(0)).toThrow(RangeError);
    expect(() => getRemainingRequestTimeoutMs(1.5)).toThrow(RangeError);
    expect(() => getRemainingRequestTimeoutMs(100, Number.NaN, 10)).toThrow(RangeError);
  });
});
