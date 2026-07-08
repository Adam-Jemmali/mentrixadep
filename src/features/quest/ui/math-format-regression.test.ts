import { describe, expect, it } from "vitest";
import { normalizeMathText } from "@/features/quest/ui/normalize-math-text";
import { formatQuestPromptText } from "@/features/quest/ui/format-quest-prompt";

const ONE_SIDED_PROMPT =
  "For $f(x) = \\begin{cases} x + 1 & x < 2 \\\\ 5 & x = 2 \\\\ 9 - x & x > 2 \\end{cases}$, find $\\lim_{x \\to 2^-} f(x)$.";

const STEP_PROMPT = "Which piece of the graph applies as $x \\to 2$ from the left?";

describe("math format regressions", () => {
  it("preserves piecewise inline prompt delimiters", () => {
    const formatted = formatQuestPromptText(ONE_SIDED_PROMPT);
    expect(formatted).toBe(ONE_SIDED_PROMPT);

    const normalized = normalizeMathText(formatted);
    expect(normalized).toContain("$$f(x) = \\begin{cases}");
    expect(normalized).toContain("\\end{cases}$$");
    expect(normalized).toContain("$\\lim_{x \\to 2^-} f(x)$");
  });

  it("preserves simple limit step prompts", () => {
    const normalized = normalizeMathText(formatQuestPromptText(STEP_PROMPT));
    expect(normalized).toBe(STEP_PROMPT);
  });

  it("renders piecewise and limit spans without KaTeX errors", async () => {
    const katex = await import("katex");
    const normalized = normalizeMathText(formatQuestPromptText(ONE_SIDED_PROMPT));
    const re = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const inner = (match[1] ?? match[2] ?? "").trim();
      const displayMode = match[1] !== undefined;
      const html = katex.default.renderToString(inner, { throwOnError: false, displayMode });
      expect(html).not.toContain('class="katex-error"');
    }
  });
});
