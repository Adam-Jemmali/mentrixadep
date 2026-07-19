import { describe, expect, it } from "vitest";
import {
  convertPlainMathExpression,
  formatQuestPromptText,
  parseQuestPromptBlocks,
} from "@/features/quest/ui/format-quest-prompt";

describe("formatQuestPromptText", () => {
  it("converts backtick math identifiers to inline LaTeX", () => {
    expect(formatQuestPromptText("displacement `h(t)` at time `t`")).toBe(
      "displacement $h(t)$ at time $t$",
    );
  });

  it("converts lim_(t->2) notation", () => {
    expect(formatQuestPromptText("estimate `lim_(t->2) h(t)`")).toContain("\\lim_{t \\to 2}");
  });

  it("wraps inline f(x) = x^3 - 2x", () => {
    const out = formatQuestPromptText(
      "Which limit represents the derivative of f(x) = x^3 - 2x?",
    );
    expect(out).toContain("$f(x) = x^{3} - 2x$");
  });

  it("formats standalone limit MCQ options", () => {
    const option = "lim (h->0) [(x+h)^3 - 2(x+h) - (x^3 - 2x)] / h";
    const out = formatQuestPromptText(option);
    expect(out).toContain("\\lim_{h \\to 0}");
    expect(out).toContain("\\frac{");
    expect(out).toContain("x^{3}");
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
  });

  it("formats derivative explanation prose without swallowing English", () => {
    const explanation =
      "The definition of the derivative f'(x) is given by the limit of the difference quotient as h approaches zero: lim (h->0) [f(x+h) - f(x)] / h. Substituting f(x)=x^3−2x into this formula gives the expression in option A.";
    const out = formatQuestPromptText(explanation);
    expect(out).toContain("$f'(x)$");
    expect(out).toContain("\\lim_{h \\to 0}");
    expect(out).toContain("$f(x) = x^{3}");
    expect(out).toContain("into this formula gives the expression in option A.");
    expect(out).not.toMatch(/\$[^$]*\binto\b[^$]*\$/);
  });

  it("formats lim (x→3) f(x) = ∞ in prose", () => {
    const out = formatQuestPromptText(
      "The statement lim (x→3) f(x) = ∞ directly expresses this condition.",
    );
    expect(out).toContain("\\lim_{x \\to 3}");
    expect(out).toContain("= \\infty");
    expect(out).toContain("directly expresses this condition.");
  });
  it("formats plain-English washer integral MCQ options", () => {
    const option =
      "pi * integral from 0 to 1 of ((2 - x^2)^2 - (2 - x)^2) dx";
    const out = formatQuestPromptText(option);
    expect(out).toContain("\\pi");
    expect(out).toContain("\\int_{0}^{1}");
    expect(out).toContain("x^{2}");
    expect(out).toContain("\\,dx");
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
  });
});

describe("convertPlainMathExpression", () => {
  it("converts bracket over h to frac", () => {
    expect(convertPlainMathExpression("[(x+h)^3 - x] / h")).toBe(
      "\\frac{(x+h)^{3} - x}{h}",
    );
  });

  it("converts English integral options", () => {
    expect(
      convertPlainMathExpression(
        "pi * integral from 0 to 1 of ((2 - x)^2 - (2 - x^2)^2) dx",
      ),
    ).toContain("\\pi \\int_{0}^{1}");
  });
});

describe("parseQuestPromptBlocks", () => {
  it("extracts markdown pipe tables", () => {
    const prompt = `A table below.

| t | h(t) |
| --- | --- |
| 1.9 | 15.8 |
| 2.1 | 16.2 |

Which strategy?`;

    const blocks = parseQuestPromptBlocks(prompt);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ type: "text", content: "A table below." });
    expect(blocks[1]).toMatchObject({
      type: "table",
      headers: ["$t$", "$h(t)$"],
      rows: [
        ["1.9", "15.8"],
        ["2.1", "16.2"],
      ],
    });
    expect(blocks[2]).toMatchObject({ type: "text", content: "Which strategy?" });
  });
});
