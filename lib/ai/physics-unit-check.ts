export type PhysicsUnitCheck = {
  formulaUnit: string;
  claimedUnit: string;
};

export type PhysicsUnitResult = {
  formulaUnit: string;
  claimedUnit: string;
  status: "dimensionally_consistent" | "dimension_mismatch" | "uncheckable";
  message: string;
};

type Dimensions = [number, number, number, number, number, number, number];

const UNIT_DIMENSIONS: Record<string, Dimensions> = {
  m: [0, 1, 0, 0, 0, 0, 0],
  cm: [0, 1, 0, 0, 0, 0, 0],
  mm: [0, 1, 0, 0, 0, 0, 0],
  km: [0, 1, 0, 0, 0, 0, 0],
  kg: [1, 0, 0, 0, 0, 0, 0],
  g: [1, 0, 0, 0, 0, 0, 0],
  mg: [1, 0, 0, 0, 0, 0, 0],
  s: [0, 0, 1, 0, 0, 0, 0],
  min: [0, 0, 1, 0, 0, 0, 0],
  h: [0, 0, 1, 0, 0, 0, 0],
  A: [0, 0, 0, 1, 0, 0, 0],
  K: [0, 0, 0, 0, 1, 0, 0],
  mol: [0, 0, 0, 0, 0, 1, 0],
  cd: [0, 0, 0, 0, 0, 0, 1],
  Hz: [0, 0, -1, 0, 0, 0, 0],
  N: [1, 1, -2, 0, 0, 0, 0],
  J: [1, 2, -2, 0, 0, 0, 0],
  W: [1, 2, -3, 0, 0, 0, 0],
  Pa: [1, -1, -2, 0, 0, 0, 0],
  C: [0, 0, 1, 1, 0, 0, 0],
  V: [1, 2, -3, -1, 0, 0, 0],
  ohm: [1, 2, -3, -2, 0, 0, 0],
};

function parseUnit(source: string): Dimensions {
  const unit = source.replace(/\s+/g, "");
  if (!unit || unit.length > 100) throw new Error("Unit expression is empty or too long.");
  const tokens = unit.split(/([*/])/);
  if (tokens.length % 2 === 0 || tokens.length > 31) throw new Error("Unit expression has invalid operators.");

  const result: Dimensions = [0, 0, 0, 0, 0, 0, 0];
  let sign = 1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (index % 2 === 1) {
      if (token !== "*" && token !== "/") throw new Error("Unsupported unit operator.");
      sign = token === "*" ? 1 : -1;
      continue;
    }
    if (token === "1") continue;
    const match = token.match(/^([A-Za-z]+)(?:\^(-?\d{1,2}))?$/);
    if (!match) throw new Error("Unsupported unit notation.");
    const dimensions = Object.hasOwn(UNIT_DIMENSIONS, match[1]) ? UNIT_DIMENSIONS[match[1]] : undefined;
    if (!dimensions) throw new Error("Unknown SI unit: " + match[1]);
    const exponent = Number(match[2] ?? "1") * sign;
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 12) throw new Error("Unit exponent is outside the supported range.");
    for (let dimension = 0; dimension < result.length; dimension += 1) {
      result[dimension] += dimensions[dimension] * exponent;
    }
  }
  return result;
}

export function checkPhysicsUnits(checks: PhysicsUnitCheck[]): PhysicsUnitResult[] {
  return checks.map((item) => {
    try {
      const formulaDimensions = parseUnit(item.formulaUnit);
      const claimedDimensions = parseUnit(item.claimedUnit);
      const matches = formulaDimensions.every((value, index) => value === claimedDimensions[index]);
      return {
        formulaUnit: item.formulaUnit,
        claimedUnit: item.claimedUnit,
        status: matches ? "dimensionally_consistent" : "dimension_mismatch",
        message: matches
          ? "The supplied formula-unit and answer-unit dimensions match."
          : "The supplied formula-unit and answer-unit dimensions do not match.",
      };
    } catch (error) {
      return {
        formulaUnit: item.formulaUnit,
        claimedUnit: item.claimedUnit,
        status: "uncheckable",
        message: error instanceof Error ? error.message : "These units could not be checked.",
      };
    }
  });
}
