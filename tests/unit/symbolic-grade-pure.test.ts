import { describe, expect, it } from "vitest";
import {
  gradeExpressions,
  hashGradingExpression,
  normalizeGradingExpression,
} from "@/features/free-response/symbolic-grade-pure";

describe("symbolic grade pure", () => {
  it("normalizes python-style powers for mathjs", () => {
    expect(normalizeGradingExpression("3*x**2 + 2*x")).toBe("3*x^2 + 2*x");
  });

  it("grades equivalent polynomials symbolically", () => {
    const result = gradeExpressions({
      student_expression: "3*x**2 + 2*x",
      correct_expression: "2*x + 3*x^2",
      variables: { x: { min: -2, max: 2 } },
    });
    expect(result.equivalent).toBe(true);
    expect(result.method).toBe("symbolic");
  });

  it("rejects non-equivalent expressions", () => {
    const result = gradeExpressions({
      student_expression: "x^2",
      correct_expression: "x^3",
      variables: { x: { min: 1, max: 3 } },
    });
    expect(result.equivalent).toBe(false);
  });

  it("uses numeric sampling for transcendental expressions", () => {
    const result = gradeExpressions({
      student_expression: "sin(x)^2 + cos(x)^2",
      correct_expression: "1",
      variables: { x: { min: 0, max: 6.28 } },
    });
    expect(result.equivalent).toBe(true);
    expect(result.method).toBe("numeric");
  });

  it("hashes normalized expressions consistently", () => {
    expect(hashGradingExpression("3*x**2")).toBe(hashGradingExpression("3*x^2"));
  });
});
