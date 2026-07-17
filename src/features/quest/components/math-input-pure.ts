/** Convert student-friendly notation into KaTeX-safe LaTeX for live preview. */
export function studentNotationToLatex(input: string): string {
  let text = input.trim();
  if (!text) return "";

  text = text.replace(/∫/g, "\\int ");
  text = text.replace(/\bd\s*\/\s*d([a-zA-Z])/gi, "\\frac{d}{d$1}");
  text = text.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");

  text = text.replace(/\bsqrt\(([^()]*)\)/gi, (_, inner: string) => `\\sqrt{${inner.trim()}}`);
  for (const fn of ["sin", "cos", "tan", "sec", "csc", "cot", "ln", "log"] as const) {
    text = text.replace(
      new RegExp(`\\b${fn}\\(([^)]*)\\)`, "gi"),
      `\\${fn}\\left($1\\right)`,
    );
  }

  text = text.replace(/\be\^\(([^()]+)\)/gi, "e^{$1}");
  text = text.replace(/\be\^([a-zA-Z0-9]+)/gi, "e^{$1}");
  text = text.replace(/\^(\([^)]+\))/g, "^{$1}");
  text = text.replace(/\^([a-zA-Z0-9]+)/g, "^{$1}");

  text = text.replace(/(\d)([a-zA-Z(])/g, "$1$2");
  text = text.replace(/\*\*/g, "^");
  text = text.replace(/\*/g, " \\cdot ");

  return text.replace(/\s+/g, " ").trim();
}

export function studentNotationToGradingExpression(input: string): string {
  return input
    .trim()
    .replace(/∫/g, "integral_marker")
    .replace(/\bd\s*\/\s*d([a-zA-Z])/gi, "derivative($1)")
    .replace(/\bsqrt\(([^()]*)\)/gi, "sqrt($1)")
    .replace(/\be\^(\([^)]+\)|[a-zA-Z0-9]+)/gi, "exp($1)")
    .replace(/\^/g, "**")
    .replace(/integral_marker/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildIncorrectMathFeedback(method: "symbolic" | "numeric"): string {
  if (method === "numeric") {
    return "Not equivalent on the sampled domain. Adjust the expression and try again.";
  }
  return "Not equivalent yet. Rebuild the expression and submit again.";
}

export function buildCorrectMathFeedback(): string {
  return "Equivalent. Your construction matches the canonical answer.";
}
