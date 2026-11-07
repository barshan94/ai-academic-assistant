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
  it("G-001: checks both inverse-operation steps and substitution for a linear equation", () => {
    const results = checkCalculations([
      { expression: "17 - 5", claimedResult: 12, unit: "" },
      { expression: "12 / 2", claimedResult: 6, unit: "" },
      { expression: "2 * 6 + 5", claimedResult: 17, unit: "" },
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "passed",
      "passed",
      "passed",
    ]);
    expect(results.map((result) => result.calculatedResult)).toEqual([12, 6, 17]);
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


  it("rejects incorrect claims across arithmetic, physics units and chemical balance", () => {
    const linear = checkCalculations([
      { expression: "12 / 2", claimedResult: 5, unit: "" },
    ])[0];
    const force = checkCalculations([
      { expression: "2.0 * 3.0", claimedResult: 5.0, unit: "N" },
    ])[0];
    const wrongUnit = checkPhysicsUnits([
      { formulaUnit: "kg*m/s^2", claimedUnit: "kg" },
    ])[0];
    const unbalanced = checkChemicalEquations([
      { equation: "Mg + O2 -> MgO", claimedBalanced: false },
    ])[0];
    const falseBalanceClaim = checkChemicalEquations([
      { equation: "Mg + O2 -> MgO", claimedBalanced: true },
    ])[0];
    const wrongPercentage = checkCalculations([
      { expression: "(92 - 80) / 92 * 100", claimedResult: 15, unit: "%" },
    ])[0];

    expect(linear.status).toBe("mismatch");
    expect(force.status).toBe("mismatch");
    expect(wrongUnit.status).toBe("dimension_mismatch");
    expect(unbalanced.status).toBe("unbalanced");
    expect(falseBalanceClaim.status).toBe("claim_mismatch");
    expect(wrongPercentage.status).toBe("mismatch");
  });

});
