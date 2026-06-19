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
});
