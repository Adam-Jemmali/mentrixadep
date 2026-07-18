import { describe, expect, it } from "vitest";
import {
  enrichQuestStimulus,
  hasQuestStimulus,
  inferGraphDomain,
  normalizeGraphExpression,
  parseQuestStimulus,
  riemannBarCenters,
  sampleCurvePoints,
} from "@/features/quest/quest-stimulus-pure";

describe("quest-stimulus-pure", () => {
  it("parses table and function graph stimulus", () => {
    const stimulus = parseQuestStimulus([
      {
        kind: "table",
        title: "Velocity",
        headers: ["t (seconds)", "v(t) (m/s)"],
        rows: [
          ["0", "0"],
          ["1", "5"],
          ["2", "12"],
        ],
      },
      {
        kind: "function_graph",
        alt: "Velocity graph with midpoint rectangles",
        xLabel: "t",
        yLabel: "v(t)",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 5 },
          { x: 2, y: 12 },
          { x: 3, y: 18 },
          { x: 4, y: 20 },
          { x: 5, y: 16 },
          { x: 6, y: 10 },
        ],
        riemann: {
          method: "midpoint",
          from: 0,
          to: 6,
          n: 3,
          heights: [5, 18, 16],
        },
      },
    ]);

    expect(stimulus).toHaveLength(2);
    expect(stimulus[0]?.kind).toBe("table");
    expect(stimulus[1]?.kind).toBe("function_graph");
    expect(hasQuestStimulus(stimulus)).toBe(true);
  });

  it("builds midpoint Riemann bar centers", () => {
    const bars = riemannBarCenters({ method: "midpoint", from: 0, to: 6, n: 3 });
    expect(bars).toHaveLength(3);
    expect(bars[0]).toEqual({ xLeft: 0, xRight: 2, xSample: 1 });
    expect(bars[1]).toEqual({ xLeft: 2, xRight: 4, xSample: 3 });
    expect(bars[2]).toEqual({ xLeft: 4, xRight: 6, xSample: 5 });
  });

  it("samples curve points with an evaluate callback", () => {
    const points = sampleCurvePoints("x^2", [0, 2], 5, (expr, x) => {
      expect(expr).toBe("x^2");
      return x * x;
    });
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[4]?.y).toBeCloseTo(4);
  });

  it("infers domain from points", () => {
    const domain = inferGraphDomain({
      kind: "function_graph",
      alt: "points",
      points: [
        { x: 1, y: 2 },
        { x: 5, y: 4 },
      ],
    });
    expect(domain[0]).toBeLessThan(1);
    expect(domain[1]).toBeGreaterThan(5);
  });

  it("auto-builds table and midpoint graph from prompt markdown", () => {
    const enriched = enrichQuestStimulus({
      prompt: `The velocity is given in the table below. Using a midpoint Riemann sum with 3 equal subintervals, approximate distance from t = 0 to t = 6.

| t (seconds) | v(t) (m/s) |
| --- | --- |
| 0 | 0 |
| 1 | 5 |
| 2 | 12 |
| 3 | 18 |
| 4 | 20 |
| 5 | 16 |
| 6 | 10 |
`,
    });

    expect(enriched.stimulus.some((s) => s.kind === "table")).toBe(true);
    const graph = enriched.stimulus.find((s) => s.kind === "function_graph");
    expect(graph?.kind).toBe("function_graph");
    if (graph?.kind === "function_graph") {
      expect(graph.points?.length).toBe(7);
      expect(graph.riemann).toEqual({
        method: "midpoint",
        from: 0,
        to: 6,
        n: 3,
        heights: [5, 18, 16],
      });
    }
    expect(enriched.prompt.includes("|")).toBe(false);
  });

  it("graphs an explicit function expression from the prompt", () => {
    const enriched = enrichQuestStimulus({
      prompt: "Let f(x) = x^2 + 1. Which statement is true about the graph?",
    });
    const graph = enriched.stimulus.find((s) => s.kind === "function_graph");
    expect(graph?.kind).toBe("function_graph");
    if (graph?.kind === "function_graph") {
      expect(graph.curves?.[0]?.expression).toBe("x^2+1");
      expect(graph.curves?.[0]?.color).toBe("#2D70B3");
    }
  });

  it("normalizes LaTeX exponents so the question function can plot", () => {
    expect(normalizeGraphExpression("3x^{4}-2x^{3}+5x-1$, what is")).toBe("3x^4-2x^3+5x-1");
    expect(normalizeGraphExpression("3x^4 - 2x^3 + 5x - 1")).toBe("3x^4-2x^3+5x-1");
  });

  it("draws f(x) from derivative prompts that use LaTeX in the stem", () => {
    const enriched = enrichQuestStimulus({
      prompt:
        "If $f(x) = 3x^{4} - 2x^{3} + 5x - 1$, what is the second derivative, $f''(x)$?",
    });
    const graph = enriched.stimulus.find((s) => s.kind === "function_graph");
    expect(graph?.kind).toBe("function_graph");
    if (graph?.kind === "function_graph") {
      expect(graph.curves?.[0]?.expression).toBe("3x^4-2x^3+5x-1");
      expect(graph.curves?.[0]?.color).toBe("#2D70B3");
    }
  });
});
