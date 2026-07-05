import { describe, expect, it } from "vitest";
import { tokenizeQuestPromptHighlights } from "@/features/quest/ui/quest-prompt-highlight-pure";

describe("tokenizeQuestPromptHighlights", () => {
  it("highlights numbers and calculus keywords outside math", () => {
    const tokens = tokenizeQuestPromptHighlights(
      "Find the derivative of f(x) = x^3 when x = 2 meters per second.",
    );
    expect(tokens.some((t) => t.kind === "keyword" && /derivative/i.test(t.text))).toBe(true);
    expect(tokens.some((t) => t.kind === "number" && t.text === "2")).toBe(true);
  });

  it("does not highlight inside dollar math delimiters", () => {
    const tokens = tokenizeQuestPromptHighlights("Evaluate $\\lim_{x \\to 2} f(x)$ at x = 3.");
    const plainMath = tokens.find((t) => t.text.startsWith("$"));
    expect(plainMath?.kind).toBe("plain");
    expect(tokens.some((t) => t.kind === "number" && t.text === "3")).toBe(true);
  });

  it("highlights AP units", () => {
    const tokens = tokenizeQuestPromptHighlights("Velocity is 5 m/s after 10 seconds.");
    expect(tokens.some((t) => t.kind === "unit" && t.text === "m/s")).toBe(true);
    expect(tokens.some((t) => t.kind === "number" && t.text === "5")).toBe(true);
  });
});
