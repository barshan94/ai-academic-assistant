export type CalculationCheckInput = {
  expression: string;
  claimedResult: number;
  unit: string;
};

export type CalculationCheckResult = {
  expression: string;
  claimedResult: number;
  calculatedResult: number | null;
  unit: string;
  status: "passed" | "mismatch" | "uncheckable";
  message: string;
};

class ExpressionError extends Error {}

function evaluateArithmeticExpression(source: string): number {
  if (!source.trim() || source.length > 200) throw new ExpressionError("Expression is empty or too long.");

  const normalized = source.replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-");
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    if (/\s/.test(normalized[cursor])) {
      cursor += 1;
      continue;
    }

    const match = normalized.slice(cursor).match(/^(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+\-*/^])/);
    if (!match) throw new ExpressionError("Only basic arithmetic expressions are supported.");
    tokens.push(match[0]);
    cursor += match[0].length;
    if (tokens.length > 100) throw new ExpressionError("Expression has too many parts.");
  }

  let index = 0;
  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  function primary(): number {
    const token = consume();
    if (token === undefined) throw new ExpressionError("Unexpected end of expression.");

    if (token === "(") {
      const value = expression();
      if (consume() !== ")") throw new ExpressionError("Missing closing parenthesis.");
      return value;
    }

    if (/^(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new ExpressionError("Number is outside the supported range.");
      return value;
    }

    throw new ExpressionError("Expected a number or opening parenthesis.");
  }

  function power(): number {
    const base = primary();
    if (peek() !== "^") return base;
    consume();
    const exponent = unary();
    if (Math.abs(exponent) > 100) throw new ExpressionError("Exponent is outside the supported range.");
    const value = base ** exponent;
    if (!Number.isFinite(value)) throw new ExpressionError("Calculation result is outside the supported range.");
    return value;
  }

  function unary(): number {
    if (peek() === "+") {
      consume();
      return unary();
    }
    if (peek() === "-") {
      consume();
      return -unary();
    }
    return power();
  }

  function term(): number {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const operator = consume();
      const right = unary();
      if (operator === "/" && right === 0) throw new ExpressionError("Division by zero.");
      value = operator === "*" ? value * right : value / right;
      if (!Number.isFinite(value)) throw new ExpressionError("Calculation result is outside the supported range.");
    }
    return value;
  }

  function expression(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = term();
      value = operator === "+" ? value + right : value - right;
      if (!Number.isFinite(value)) throw new ExpressionError("Calculation result is outside the supported range.");
    }
    return value;
  }

  const result = expression();
  if (index !== tokens.length) throw new ExpressionError("Unexpected content after the expression.");
  return result;
}

export function checkCalculations(
  calculations: CalculationCheckInput[],
  tolerances = { absolute: 1e-9, relative: 1e-6 },
): CalculationCheckResult[] {
  return calculations.map((item) => {
    try {
      const calculatedResult = evaluateArithmeticExpression(item.expression);
      const difference = Math.abs(calculatedResult - item.claimedResult);
      const allowedDifference = Math.max(
        tolerances.absolute,
        Math.abs(calculatedResult) * tolerances.relative,
      );
      const passed = difference <= allowedDifference;

      return {
        expression: item.expression,
        claimedResult: item.claimedResult,
        calculatedResult,
        unit: item.unit,
        status: passed ? "passed" : "mismatch",
        message: passed
          ? "The stated numerical result matches this arithmetic expression."
          : "The stated numerical result does not match this arithmetic expression.",
      };
    } catch (error) {
      return {
        expression: item.expression,
        claimedResult: item.claimedResult,
        calculatedResult: null,
        unit: item.unit,
        status: "uncheckable",
        message: error instanceof Error ? error.message : "This expression could not be checked.",
      };
    }
  });
}
