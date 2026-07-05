import { describe, expect, it } from "vitest";
import { normalizeMathText } from "@/features/quest/ui/normalize-math-text";
import { formatQuestPromptText } from "@/features/quest/ui/format-quest-prompt";
import { sanitizeQuestMathInput } from "@/features/quest/ui/sanitize-quest-math";

const INTEGRAL_QUESTION =
  "If \\int_{1}^{5} f(x) \\dx$ = 7$ and $\\int_{1}^{5} g(x) \\ dx = -3$, what is the value of $\\int_{1}^{5} (2f(x) - 3g(x)) \\ dx$?";

const INTEGRAL_EXPLANATION =
  "Using the linearity property of definite integrals, \\int_{a}^{b} (cf(x) \\pm dg(x)) \\dx$ = c$\\int_{a}^{b} f(x) \\dx$ \\pm d$\\int_{a}^{b} g(x) \\dx. Substituting the given values, we calculate $2(7) - 3(-3) = 14 - (-9) = 14 + 9 = 23$.";

describe("sanitizeQuestMathInput", () => {
  it("repairs split integral equations with \\dx shorthand", () => {
    const out = sanitizeQuestMathInput("\\int_{1}^{5} f(x) \\dx$ = 7$");
    expect(out).toBe("$\\int_{1}^{5} f(x) \\,dx = 7$");
    expect(out).not.toContain("\\dx");
    expect(out).not.toMatch(/\\dx\$/);
  });

  it("repairs full integral question before KaTeX", () => {
    const out = sanitizeQuestMathInput(INTEGRAL_QUESTION);
    expect(out).toContain("$\\int_{1}^{5} f(x) \\,dx = 7$");
    expect(out).toContain("$\\int_{1}^{5} g(x) \\,dx = -3$");
    expect(out).toContain("$\\int_{1}^{5} (2f(x) - 3g(x)) \\,dx$");
  });

  it("repairs multi-integral linearity formulas", () => {
    const out = sanitizeQuestMathInput(
      "\\int_{a}^{b} (cf(x) \\pm dg(x)) \\dx$ = c$\\int_{a}^{b} f(x) \\dx$ \\pm d$\\int_{a}^{b} g(x) \\dx",
    );
    expect(out).not.toContain("\\dx");
    expect(out).not.toMatch(/\d\$\s*\\int/);
    expect(out).toContain("\\int_{a}^{b}");
    expect(out).toContain("\\,dx");
  });
});

describe("normalizeMathText integral repairs", () => {
  it("renders integral question without orphan dollar signs", () => {
    const out = normalizeMathText(INTEGRAL_QUESTION);
    expect(out).not.toContain("\\dx");
    expect(out).not.toMatch(/\\dx\$/);
    expect(out).toContain("$\\int_{1}^{5} f(x) \\,dx = 7$");
    expect(out).toContain("$\\int_{1}^{5} g(x) \\,dx = -3$");
    expect(out).toContain("$\\int_{1}^{5} (2f(x) - 3g(x)) \\,dx$");
  });

  it("renders linearity explanation as valid math spans", () => {
    const out = normalizeMathText(INTEGRAL_EXPLANATION);
    expect(out).not.toContain("\\dx");
    expect(out).not.toMatch(/\d\$\s*\\int/);
    const mathSpans = out.match(/\$[^$]+\$/g) ?? [];
    expect(mathSpans.length).toBeGreaterThanOrEqual(2);
    for (const span of mathSpans) {
      expect(span).not.toMatch(/\\dx/);
    }
  });
});

describe("formatQuestPromptText integral repairs", () => {
  it("formats broken integral question for KaTeX", () => {
    const out = formatQuestPromptText(INTEGRAL_QUESTION);
    expect(out).toContain("$\\int_{1}^{5} f(x) \\,dx = 7$");
    expect(out).not.toContain("\\dx");
  });
});

describe("KaTeX render smoke", () => {
  it("renders repaired integral question without parse errors", async () => {
    const katex = await import("katex");
    const normalized = normalizeMathText(INTEGRAL_QUESTION);
    const re = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const inner = (match[1] ?? match[2] ?? "").trim();
      const html = katex.default.renderToString(inner, { throwOnError: false, displayMode: false });
      expect(html).not.toContain('class="katex-error"');
    }
  });
});
