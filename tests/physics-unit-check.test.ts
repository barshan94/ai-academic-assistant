import { describe, expect, it } from "vitest";
import { checkPhysicsUnits } from "@/lib/ai/physics-unit-check";

describe("physics dimensional consistency checks", () => {
  it("recognizes equivalent SI base and derived units", () => {
    const results = checkPhysicsUnits([
      { formulaUnit: "kg*m/s^2", claimedUnit: "N" },
      { formulaUnit: "N*m", claimedUnit: "J" },
      { formulaUnit: "J/s", claimedUnit: "W" },
      { formulaUnit: "A*s", claimedUnit: "C" },
      { formulaUnit: "V/A", claimedUnit: "ohm" },
      { formulaUnit: "1/s", claimedUnit: "Hz" },
    ]);
    expect(results.map((item) => item.status)).toEqual(Array(6).fill("dimensionally_consistent"));
  });

  it("detects dimension mismatches", () => {
    const [result] = checkPhysicsUnits([
      { formulaUnit: "kg*m/s^2", claimedUnit: "J" },
    ]);
    expect(result.status).toBe("dimension_mismatch");
  });

  it("supports negative exponents and ignores unit scale prefixes for dimensions", () => {
    const results = checkPhysicsUnits([
      { formulaUnit: "m/s^-1", claimedUnit: "m*s" },
      { formulaUnit: "cm", claimedUnit: "km" },
      { formulaUnit: "g*m/s^2", claimedUnit: "N" },
    ]);
    expect(results.map((item) => item.status)).toEqual(Array(3).fill("dimensionally_consistent"));
  });

  it("does not guess unknown or malformed units", () => {
    const results = checkPhysicsUnits([
      { formulaUnit: "kg*widget/s^2", claimedUnit: "N" },
      { formulaUnit: "kg//s", claimedUnit: "N" },
      { formulaUnit: "kg*m/s^99", claimedUnit: "N" },
      { formulaUnit: "constructor", claimedUnit: "constructor" },
      { formulaUnit: "toString", claimedUnit: "toString" },
    ]);
    expect(results.every((item) => item.status === "uncheckable")).toBe(true);
  });
});
