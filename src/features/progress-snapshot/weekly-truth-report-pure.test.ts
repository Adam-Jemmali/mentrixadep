import { describe, expect, it } from "vitest";
import {
  assembleWeeklyTruthReport,
  buildCauseSentence,
  buildMovedSentence,
  buildStuckSentence,
  pickLargestPositiveMove,
  pickStuckNode,
} from "@/features/progress-snapshot/weekly-truth-report-pure";

describe("buildMovedSentence", () => {
  it("names the node and percents", () => {
    expect(
      buildMovedSentence({
        skillNodeId: "n1",
        nodeName: "Chain Rule",
        fromPercent: 41,
        toPercent: 78,
      }),
    ).toBe("Your accuracy on Chain Rule moved from 41 to 78 percent this week.");
  });

  it("falls back when nothing moved", () => {
    expect(buildMovedSentence(null)).toBe("Your accuracy held steady.");
  });
});

describe("buildCauseSentence", () => {
  it("prefers Guide sessions", () => {
    expect(buildCauseSentence({ kind: "guide", guideName: "Jordan" })).toBe(
      "This followed a session with Jordan.",
    );
  });

  it("uses practice count", () => {
    expect(buildCauseSentence({ kind: "practice", sessionCount: 3 })).toBe(
      "This came from 3 practice sessions on that node.",
    );
  });
});

describe("buildStuckSentence", () => {
  it("names the resisting node", () => {
    expect(buildStuckSentence({ nodeName: "Limits", attempts: 8 })).toBe(
      "Limits resisted improvement despite 8 attempts. Consider a different approach.",
    );
  });

  it("falls back when clear", () => {
    expect(buildStuckSentence(null)).toBe("No persistent blocks this week.");
  });
});

describe("pickLargestPositiveMove", () => {
  it("selects the biggest lift", () => {
    const moved = pickLargestPositiveMove([
      {
        skillNodeId: "a",
        nodeName: "A",
        currentAccuracy: 50,
        priorAccuracy: 40,
      },
      {
        skillNodeId: "b",
        nodeName: "Chain Rule",
        currentAccuracy: 78,
        priorAccuracy: 41,
      },
    ]);
    expect(moved?.nodeName).toBe("Chain Rule");
    expect(moved?.fromPercent).toBe(41);
  });
});

describe("pickStuckNode", () => {
  it("picks most attempts with no lift", () => {
    const stuck = pickStuckNode([
      {
        nodeName: "Soft",
        attempts: 4,
        currentAccuracy: 60,
        priorAccuracy: 50,
      },
      {
        nodeName: "Limits",
        attempts: 8,
        currentAccuracy: 40,
        priorAccuracy: 42,
      },
    ]);
    expect(stuck).toEqual({ nodeName: "Limits", attempts: 8 });
  });
});

describe("assembleWeeklyTruthReport", () => {
  it("returns four brief sentences", () => {
    const report = assembleWeeklyTruthReport({
      moved: {
        skillNodeId: "n1",
        nodeName: "Chain Rule",
        fromPercent: 41,
        toPercent: 78,
      },
      cause: { kind: "guide", guideName: "Jordan" },
      stuck: null,
      nextActionLabel: "Verify Limits",
    });
    expect(report.nextAction).toBe("Verify Limits");
    expect(report.stuck).toBe("No persistent blocks this week.");
  });
});
