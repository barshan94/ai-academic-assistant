export type ArithmeticCheck = {
  expression: string;
  expected: number;
  stated: number;
  passed: boolean;
};

const pattern = /(-?\d+(?:\.\d+)?)\s*([+−\-×*÷/])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/g;

export function checkExplicitArithmetic(text: string): ArithmeticCheck[] {
  const checks: ArithmeticCheck[] = [];
  for (const match of text.matchAll(pattern)) {
    const left = Number(match[1]);
    const operator = match[2];
    const right = Number(match[3]);
    const stated = Number(match[4]);
    let expected: number;
    if (operator === "+" ) expected = left + right;
    else if (operator === "-" || operator === "−") expected = left - right;
    else if (operator === "*" || operator === "×") expected = left * right;
    else {
      if (right === 0) continue;
      expected = left / right;
    }
    const passed = Number.isFinite(expected) && Math.abs(expected - stated) <= Math.max(1e-9, Math.abs(expected) * 1e-9);
    checks.push({ expression: match[0], expected, stated, passed });
    if (checks.length >= 50) break;
  }
  return checks;
}

export function getVerificationLabel(checks: ArithmeticCheck[]) {
  if (!checks.length) return "not_verified" as const;
  return checks.every((check) => check.passed) ? "partial_arithmetic_checks_passed" as const : "arithmetic_check_failed" as const;
}
