import { describe, expect, it } from "vitest";
import { checkExplicitArithmetic, getVerificationLabel } from "@/lib/ai/arithmetic-check";

describe("explicit arithmetic checks", () => {
  it("checks simple arithmetic shown in generated work", () => {
    const checks = checkExplicitArithmetic("2.5 × 4 = 10; 12 / 3 = 4");
    expect(checks).toHaveLength(2);
    expect(checks.every((item) => item.passed)).toBe(true);
    expect(getVerificationLabel(checks)).toBe("partial_arithmetic_checks_passed");
  });

  it("flags a visible incorrect arithmetic equality", () => {
    const checks = checkExplicitArithmetic("8 - 3 = 6");
    expect(checks[0]?.passed).toBe(false);
    expect(getVerificationLabel(checks)).toBe("arithmetic_check_failed");
  });

  it("does not claim verification when there are no simple equalities", () => {
    const checks = checkExplicitArithmetic("The acceleration is constant.");
    expect(checks).toHaveLength(0);
    expect(getVerificationLabel(checks)).toBe("not_verified");
  });

  it("handles negative values and subtraction", () => {
    const checks = checkExplicitArithmetic("-4 + 7 = 3; 5 − 9 = -4");
    expect(checks).toHaveLength(2);
    expect(checks.every((item) => item.passed)).toBe(true);
  });

  it("does not divide by zero", () => {
    expect(checkExplicitArithmetic("4 / 0 = 2")).toHaveLength(0);
  });
});
