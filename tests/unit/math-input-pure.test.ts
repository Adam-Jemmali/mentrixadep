import { describe, expect, it } from "vitest";
import {
  buildIncorrectMathFeedback,
  studentNotationToGradingExpression,
  studentNotationToLatex,
} from "@/features/quest/components/math-input-pure";

describe("math input pure", () => {
  it("converts polynomial shorthand for KaTeX preview", () => {
    expect(studentNotationToLatex("3x^2 + 2x")).toBe("3x^{2} + 2x");
  });

  it("converts sqrt and trig calls", () => {
    expect(studentNotationToLatex("sqrt(x) + sin(x)")).toContain("\\sqrt{x}");
    expect(studentNotationToLatex("sqrt(x) + sin(x)")).toContain("\\sin\\left(x\\right)");
  });

  it("normalizes grading expressions for symbolic engine", () => {
    expect(studentNotationToGradingExpression("3x^2 + 2x")).toBe("3x**2 + 2x");
  });

  it("keeps retry feedback brief", () => {
    expect(buildIncorrectMathFeedback("symbolic")).toMatch(/Not equivalent yet/);
  });
});

describe("math input KaTeX preview smoke", () => {
  it("renders 3x^2 + 2x without parse errors", async () => {
    const katex = await import("katex");
    const latex = studentNotationToLatex("3x^2 + 2x");
    const html = katex.default.renderToString(latex, {
      throwOnError: true,
      displayMode: true,
    });
    expect(html).not.toContain('class="katex-error"');
  });
});
