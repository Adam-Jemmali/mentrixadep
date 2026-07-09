import { describe, expect, it } from "vitest";
import {
  buildEarningsForecastLine,
  countOpenSlotsForCourse,
  pickStrongestImpactNodeId,
} from "@/features/tutor/earnings-forecast-pure";

describe("pickStrongestImpactNodeId", () => {
  it("picks highest impact lift then score", () => {
    const id = pickStrongestImpactNodeId([
      { skillNodeId: "a", impactLift: 5, impactScore: 80 },
      { skillNodeId: "b", impactLift: 12, impactScore: 70 },
      { skillNodeId: "c", impactLift: 12, impactScore: 90 },
    ]);
    expect(id).toBe("c");
  });
});

describe("countOpenSlotsForCourse", () => {
  it("counts loosely matched courses", () => {
    const count = countOpenSlotsForCourse("AP CALCULUS AB", [
      { course: "AP Calculus AB" },
      { course: "AP CALCULUS AB" },
      { course: "Physics" },
    ]);
    expect(count).toBe(2);
  });
});

describe("buildEarningsForecastLine", () => {
  const demandRows = [
    {
      skillNodeId: "node-1",
      subject: "AP CALCULUS AB",
      nodeName: "Chain rule",
      weakStudentCount: 8,
      weekStart: "2026-07-07",
    },
  ];

  it("says demand is covered when slots meet demand", () => {
    const line = buildEarningsForecastLine({
      strongestImpactSkillNodeId: "node-1",
      course: "AP CALCULUS AB",
      demandRows: [{ ...demandRows[0]!, weakStudentCount: 2 }],
      openSlots: [{ course: "AP CALCULUS AB" }, { course: "AP CALCULUS AB" }],
    });
    expect(line).toBe("Your availability is meeting current demand.");
  });

  it("suggests more hours when demand exceeds slots", () => {
    const line = buildEarningsForecastLine({
      strongestImpactSkillNodeId: "node-1",
      course: "AP CALCULUS AB",
      demandRows,
      openSlots: [{ course: "AP CALCULUS AB" }],
    });
    expect(line).toBe(
      "Opening 7 more hours on AP CALCULUS AB could fill based on current student demand.",
    );
  });

  it("returns null without impact node", () => {
    expect(
      buildEarningsForecastLine({
        strongestImpactSkillNodeId: null,
        course: "AP CALCULUS AB",
        demandRows,
        openSlots: [],
      }),
    ).toBeNull();
  });
});
