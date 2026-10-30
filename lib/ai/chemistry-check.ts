export type ChemistryEquationCheck = {
  equation: string;
  claimedBalanced: boolean;
};

export type ChemistryEquationResult = {
  equation: string;
  claimedBalanced: boolean;
  status: "balanced" | "unbalanced" | "claim_mismatch" | "uncheckable";
  atomCounts: Record<string, { left: number; right: number }>;
  message: string;
};

class FormulaParseError extends Error {}

function parseFormula(formula: string): Record<string, number> {
  if (!formula || formula.length > 120 || /[.+-]/.test(formula)) {
    throw new FormulaParseError("Formula is empty, too long, or uses unsupported hydrate/ionic notation.");
  }

  let index = 0;

  function readNumber(): number {
    const start = index;
    while (index < formula.length && /[0-9]/.test(formula[index])) index += 1;
    if (start === index) return 1;
    const value = Number(formula.slice(start, index));
    if (!Number.isSafeInteger(value) || value < 1 || value > 10000) {
      throw new FormulaParseError("Formula multiplier is outside the supported range.");
    }
    return value;
  }

  function group(nested: boolean): Record<string, number> {
    const counts: Record<string, number> = {};
    let found = false;

    while (index < formula.length) {
      const char = formula[index];
      if (char === ")") {
        if (!nested) throw new FormulaParseError("Unexpected closing parenthesis.");
        index += 1;
        return counts;
      }

      if (char === "(") {
        index += 1;
        const inner = group(true);
        const multiplier = readNumber();
        for (const [element, count] of Object.entries(inner)) {
          counts[element] = (counts[element] ?? 0) + count * multiplier;
        }
        found = true;
        continue;
      }

      const element = formula.slice(index).match(/^[A-Z][a-z]?/)?.[0];
      if (!element) throw new FormulaParseError("Unsupported chemical formula notation.");
      index += element.length;
      const multiplier = readNumber();
      counts[element] = (counts[element] ?? 0) + multiplier;
      found = true;
    }

    if (nested) throw new FormulaParseError("Missing closing parenthesis.");
    if (!found) throw new FormulaParseError("Chemical formula contains no elements.");
    return counts;
  }

  return group(false);
}

function parseSide(side: string): Record<string, number> {
  const totals: Record<string, number> = {};
  const terms = side.split("+").map((term) => term.trim());
  if (terms.length < 1 || terms.length > 12 || terms.some((term) => !term)) {
    throw new FormulaParseError("Reaction side has an invalid number of terms.");
  }

  for (const rawTerm of terms) {
    const term = rawTerm.replace(/\((?:s|l|g|aq)\)$/i, "").trim();
    const match = term.match(/^(\d{1,4})?\s*([A-Z].*)$/);
    if (!match) throw new FormulaParseError("Could not read a reaction term or its coefficient.");
    const coefficient = match[1] ? Number(match[1]) : 1;
    if (coefficient < 1 || coefficient > 10000) throw new FormulaParseError("Reaction coefficient is outside the supported range.");
    const atoms = parseFormula(match[2]);
    for (const [element, count] of Object.entries(atoms)) {
      totals[element] = (totals[element] ?? 0) + count * coefficient;
      if (totals[element] > 100000) throw new FormulaParseError("Atom count is outside the supported range.");
    }
  }
  return totals;
}

export function checkChemicalEquations(checks: ChemistryEquationCheck[]): ChemistryEquationResult[] {
  return checks.map((item) => {
    try {
      if (item.equation.length > 300) throw new FormulaParseError("Equation is too long.");
      const arrows = item.equation.match(/->|→|=/g) ?? [];
      if (arrows.length !== 1) throw new FormulaParseError("Use exactly one reaction arrow.");
      const [leftText, rightText] = item.equation.split(/->|→|=/);
      const left = parseSide(leftText);
      const right = parseSide(rightText);
      const elements = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      const atomCounts: ChemistryEquationResult["atomCounts"] = {};
      let balanced = true;
      for (const element of elements) {
        atomCounts[element] = { left: left[element] ?? 0, right: right[element] ?? 0 };
        if (atomCounts[element].left !== atomCounts[element].right) balanced = false;
      }
      const claimMatches = item.claimedBalanced === balanced;
      return {
        equation: item.equation,
        claimedBalanced: item.claimedBalanced,
        status: !claimMatches ? "claim_mismatch" : balanced ? "balanced" : "unbalanced",
        atomCounts,
        message: !claimMatches
          ? "The AI's balanced/unbalanced claim does not match the atom-count check."
          : balanced
            ? "Each supported element has the same atom count on both sides."
            : "At least one element has different atom counts on the two sides.",
      };
    } catch (error) {
      return {
        equation: item.equation,
        claimedBalanced: item.claimedBalanced,
        status: "uncheckable",
        atomCounts: {},
        message: error instanceof Error ? error.message : "This equation could not be checked.",
      };
    }
  });
}
