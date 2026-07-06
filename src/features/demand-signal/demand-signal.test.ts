import { describe, expect, it } from "vitest";
import {
  buildDemandSignalNextAction,
  buildDemandSignalVerdict,
  buildGuideDemandSignals,
  courseHasOpenAvailability,
  formatDemandRowLine,
} from "@/features/demand-signal/demand-signal-pure";

const rows = [
  {
    skillNodeId: "a",
    subject: "AP Calculus AB",
    nodeName: "Chain rule",
    weakStudentCount: 12,
    weekStart: "2026-06-15",
  },
  {
    skillNodeId: "b",
    subject: "AP Calculus AB",
    nodeName: "Limits at infinity",
    weakStudentCount: 8,
    weekStart: "2026-06-15",
  },
  {
    skillNodeId: "c",
    subject: "AP Physics",
    nodeName: "Kinematics",
    weakStudentCount: 20,
    weekStart: "2026-06-15",
  },
];

describe("formatDemandRowLine", () => {
  it("formats the weekly weak-student row copy", () => {
    expect(formatDemandRowLine("Chain rule", 12)).toBe(
      "Chain rule weak for 12 learners",
    );
  });
});

describe("buildGuideDemandSignals", () => {
  it("returns top qualified nodes for verified courses only", () => {
    const signals = buildGuideDemandSignals({
      rows,
      verifiedCourseNames: ["AP Calculus AB"],
      openAvailability: [{ course: "AP Calculus AB" }],
      limit: 3,
    });
    expect(signals).toHaveLength(2);
    expect(signals[0]?.nodeName).toBe("Chain rule");
    expect(signals[0]?.hasOpenAvailability).toBe(true);
  });

  it("flags missing open availability for the node's course", () => {
    const signals = buildGuideDemandSignals({
      rows,
      verifiedCourseNames: ["AP Calculus AB"],
      openAvailability: [],
      limit: 1,
    });
    expect(signals[0]?.hasOpenAvailability).toBe(false);
  });
});

describe("courseHasOpenAvailability", () => {
  it("matches course names loosely", () => {
    expect(
      courseHasOpenAvailability("AP Calculus AB", [{ course: "ap calculus ab" }]),
    ).toBe(true);
  });
});

describe("demand signal verdict helpers", () => {
  it("ends with verdict and next action copy", () => {
    const signals = buildGuideDemandSignals({
      rows,
      verifiedCourseNames: ["AP Calculus AB"],
      openAvailability: [],
      limit: 1,
    });
    expect(buildDemandSignalVerdict(signals)).toBe(
      "Chain rule needs you most this week.",
    );
    expect(buildDemandSignalNextAction(signals)).toBe(
      "Open AP Calculus AB slot.",
    );
  });
});
