import { describe, expect, it } from "vitest";
import { normalizeMathText, textContainsMath } from "@/features/quest/ui/normalize-math-text";

describe("normalizeMathText", () => {
  it("wraps bare \\frac{}{} in dollar delimiters", () => {
    const input = "g(x) = \\frac{x^2 - 9}{x - 3} on [1, 5]";
    expect(normalizeMathText(input)).toBe("g(x) = $\\frac{x^2 - 9}{x - 3}$ on [1, 5]");
  });

  it("leaves existing $...$ segments intact", () => {
    expect(normalizeMathText("Yes, because $g(1)=4$ and $g(5)=8$")).toBe(
      "Yes, because $g(1)=4$ and $g(5)=8$",
    );
  });

  it("converts \\( ... \\) to $...$", () => {
    expect(normalizeMathText("Find \\(x+1\\) value")).toBe("Find $x+1$ value");
  });

  it("detects math in bare latex prompts", () => {
    expect(textContainsMath("g(x) = \\frac{1}{2}")).toBe(true);
  });

  it("wraps begin/end environment blocks in display math", () => {
    const input =
      "h(x) = \\begin{cases} 6 & x < -1 \\\\ x^2+5 & x \\ge -1 \\end{cases}";
    expect(normalizeMathText(input)).toContain("$$\\begin{cases}");
    expect(normalizeMathText(input)).toContain("\\end{cases}$$");
  });

  it("wraps bare definite integrals", () => {
    expect(normalizeMathText("\\int_{-2}^1 h(x) \\, dx")).toBe("$\\int_{-2}^1 h(x) \\,dx$");
  });
});
