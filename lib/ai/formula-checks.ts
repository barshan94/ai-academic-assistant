export type FormulaCheckResult = {
  warnings: string[];
  checked: true;
};

/**
 * Conservative typography/syntax checks only. This function never evaluates a
 * formula or claims that its mathematics, units, assumptions, or result are correct.
 */
export function checkFormulaSyntax(formula: string): FormulaCheckResult {
  const warnings: string[] = [];
  const value = formula.trim();
  if (!value) return { checked: true, warnings: ["Formula is empty."] };

  const opening: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\\\") {
      escaped = true;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") stack.push(character);
    else if (character in opening) {
      if (stack.pop() !== opening[character]) {
        warnings.push("A closing bracket has no matching opening bracket.");
        break;
      }
    }
  }
  if (stack.length && !warnings.some((item) => item.includes("closing bracket"))) {
    warnings.push("One or more brackets are not closed.");
  }

  if ((value.match(/=/g) ?? []).length > 1) {
    warnings.push("More than one equals sign; check whether this is an intended equation chain.");
  }
  if (/^[=+*/^]|[=+*/^]$/.test(value)) {
    warnings.push("The expression starts or ends with an operator; check whether it is incomplete.");
  }
  if (/[+*/^]{2,}/.test(value)) {
    warnings.push("Adjacent arithmetic operators detected; check the operator sequence.");
  }

  return { checked: true, warnings: [...new Set(warnings)] };
}
