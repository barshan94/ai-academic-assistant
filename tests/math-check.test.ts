import { describe, expect, it } from "vitest";
import { checkCalculations } from "@/lib/ai/math-check";

describe("deterministic arithmetic checks", () => {
  it("checks addition, multiplication, precedence and parentheses", () => {
    const results = checkCalculations([
      { expression: "12 + 3", claimedResult: 15, unit: "N" },
      { expression: "4 * 5 + 2", claimedResult: 22, unit: "J" },
      { expression: "(4 + 5) * 2", claimedResult: 18, unit: "" },
    ]);
    expect(results.map((item) => item.status)).toEqual(["passed", "passed", "passed"]);
  });

  it("supports powers, unary signs, decimals and scientific notation", () => {
    const results = checkCalculations([
      { expression: "2^3", claimedResult: 8, unit: "" },
      { expression: "-2.5 * 4", claimedResult: -10, unit: "m" },
      { expression: "1.2e3 / 6", claimedResult: 200, unit: "kg" },
    ]);
    expect(results.every((item) => item.status === "passed")).toBe(true);
  });

  it("detects a numerical mismatch without hiding the computed result", () => {
    const [result] = checkCalculations([
      { expression: "12 * 3", claimedResult: 35, unit: "N" },
    ]);
    expect(result.status).toBe("mismatch");
    expect(result.calculatedResult).toBe(36);
  });

  it("does not execute arbitrary input or silently evaluate unsupported notation", () => {
    const results = checkCalculations([
      { expression: "process.exit()", claimedResult: 0, unit: "" },
      { expression: "2(3+4)", claimedResult: 14, unit: "" },
      { expression: "1 / 0", claimedResult: 0, unit: "" },
    ]);
    expect(results.every((item) => item.status === "uncheckable")).toBe(true);
  });

  it("marks empty and excessively long expressions as uncheckable", () => {
    const results = checkCalculations([
      { expression: " ", claimedResult: 0, unit: "" },
      { expression: "1+".repeat(110), claimedResult: 0, unit: "" },
    ]);
    expect(results.every((item) => item.status === "uncheckable")).toBe(true);
  });

  it("uses a numeric tolerance for floating point results", () => {
    const [result] = checkCalculations([
      { expression: "0.1 + 0.2", claimedResult: 0.3, unit: "" },
    ]);
    expect(result.status).toBe("passed");
  });
});
