import { describe, expect, it } from "vitest";
import { checkCalculations } from "@/lib/ai/math-check";
import { checkChemicalEquations } from "@/lib/ai/chemistry-check";
import { checkPhysicsUnits } from "@/lib/ai/physics-unit-check";

/**
 * Deterministic regression anchors for the original cross-subject golden set.
 * These tests validate only the narrow calculations/representations supplied
 * to the checkers. They do not grade a generated explanation or prove that
 * the AI selected the correct method, equation, assumptions or source.
 */
describe("cross-subject golden-set deterministic anchors", () => {
  it("G-001: checks the arithmetic result for a linear-equation answer", () => {
    const [result] = checkCalculations([
      { expression: "2 * 6", claimedResult: 12, unit: "" },
    ]);
    expect(result.status).toBe("passed");
    expect(result.calculatedResult).toBe(12);
  });

  it("G-002: checks Newton's second-law arithmetic and dimensional unit", () => {
    const [calculation] = checkCalculations([
      { expression: "2.0 * 3.0", claimedResult: 6.0, unit: "N" },
    ]);
    const [unit] = checkPhysicsUnits([
      { formulaUnit: "kg*m/s^2", claimedUnit: "N" },
    ]);
    expect(calculation.status).toBe("passed");
    expect(unit.status).toBe("dimensionally_consistent");
  });

  it("G-003: checks atom conservation for the balanced magnesium equation", () => {
    const [result] = checkChemicalEquations([
      { equation: "2Mg + O2 -> 2MgO", claimedBalanced: true },
    ]);
    expect(result.status).toBe("balanced");
    expect(result.atomCounts).toEqual({
      Mg: { left: 2, right: 2 },
      O: { left: 2, right: 2 },
    });
  });

  it("G-005: checks percentage-change arithmetic using the original value", () => {
    const [result] = checkCalculations([
      { expression: "(92 - 80) / 80 * 100", claimedResult: 15, unit: "%" },
    ]);
    expect(result.status).toBe("passed");
    expect(result.calculatedResult).toBe(15);
  });

  it("does not pretend G-004's conceptual ICT response has a deterministic checker", () => {
    // This case must remain a human-graded explanation, not a fabricated
    // numeric/formula check. The golden-set rubric carries its expected points.
    expect(true).toBe(true);
  });
});
