import { describe, expect, it } from "vitest";
import { checkChemicalEquations } from "@/lib/ai/chemistry-check";

describe("deterministic chemistry equation checks", () => {
  it("recognizes balanced equations with simple and grouped formulae", () => {
    const results = checkChemicalEquations([
      { equation: "2H2 + O2 -> 2H2O", claimedBalanced: true },
      { equation: "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O", claimedBalanced: true },
      { equation: "Fe2O3 + 3CO -> 2Fe + 3CO2", claimedBalanced: true },
    ]);
    expect(results.map((item) => item.status)).toEqual(["balanced", "balanced", "balanced"]);
  });

  it("detects an unbalanced equation and incorrect AI claims", () => {
    const [unbalanced, mismatch] = checkChemicalEquations([
      { equation: "H2 + O2 -> H2O", claimedBalanced: false },
      { equation: "H2 + O2 -> H2O", claimedBalanced: true },
    ]);
    expect(unbalanced.status).toBe("unbalanced");
    expect(mismatch.status).toBe("claim_mismatch");
    expect(mismatch.atomCounts.O).toEqual({ left: 2, right: 1 });
  });

  it("supports state symbols and different arrow forms", () => {
    const [result] = checkChemicalEquations([
      { equation: "2Na(s) + Cl2(g) = 2NaCl(s)", claimedBalanced: true },
    ]);
    expect(result.status).toBe("balanced");
  });

  it("marks ionic charges, hydrates and malformed formulae as uncheckable", () => {
    const results = checkChemicalEquations([
      { equation: "Ag+ + Cl- -> AgCl", claimedBalanced: true },
      { equation: "CuSO4.5H2O -> CuSO4 + 5H2O", claimedBalanced: true },
      { equation: "Mg(OH -> MgO + H2O", claimedBalanced: true },
      { equation: "H()2 + O2 -> H2O", claimedBalanced: true },
      { equation: "Xx2 + O2 -> Xx2O2", claimedBalanced: true },
    ]);
    expect(results.every((item) => item.status === "uncheckable")).toBe(true);
  });

  it("rejects unsupported reaction structures and excessive input", () => {
    const results = checkChemicalEquations([
      { equation: "H2 + O2", claimedBalanced: false },
      { equation: "H2 + O2 -> H2O -> H2O2", claimedBalanced: false },
      { equation: "H".repeat(301) + " -> H2", claimedBalanced: false },
    ]);
    expect(results.every((item) => item.status === "uncheckable")).toBe(true);
  });
});
