import { describe, expect, it } from "vitest";
import {
  averageGuideRateCents,
  buildEarningsForecastLine,
  buildGuideEarningsForecast,
  computeMonthlyProjectionDollars,
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

describe("computeMonthlyProjectionDollars", () => {
  it("projects net monthly earnings from pace", () => {
    const projected = computeMonthlyProjectionDollars({
      sessionsThisMonth: 4,
      daysElapsedInMonth: 10,
      guideRateCents: 5000,
    });
    expect(projected).toBe(510);
  });

  it("returns null without sessions", () => {
    expect(
      computeMonthlyProjectionDollars({
        sessionsThisMonth: 0,
        daysElapsedInMonth: 10,
        guideRateCents: 5000,
      }),
    ).toBeNull();
  });
});

describe("buildGuideEarningsForecast", () => {
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
    const view = buildGuideEarningsForecast({
      strongestImpactSkillNodeId: "node-1",
      course: "AP CALCULUS AB",
      demandRows: [{ ...demandRows[0]!, weakStudentCount: 2 }],
      openSlots: [{ course: "AP CALCULUS AB" }, { course: "AP CALCULUS AB" }],
      sessionsThisMonth: 0,
      sessionRatesCents: [],
      daysElapsedInMonth: 12,
    });
    expect(view?.demandPrimary).toBe("Your availability is meeting current demand.");
    expect(view?.showCta).toBe(false);
    expect(view?.ctaLabel).toBe("Your schedule is full");
  });

  it("suggests more hours when demand exceeds slots", () => {
    const view = buildGuideEarningsForecast({
      strongestImpactSkillNodeId: "node-1",
      course: "AP CALCULUS AB",
      demandRows,
      openSlots: [{ course: "AP CALCULUS AB" }],
      sessionsThisMonth: 2,
      sessionRatesCents: [4000],
      daysElapsedInMonth: 10,
    });
    expect(view?.demandPrimary).toBe("Opening 7 more hours on AP CALCULUS AB could fill");
    expect(view?.demandSecondary).toBe("based on 8 students in need.");
    expect(view?.showCta).toBe(true);
    expect(view?.projectedDollars).toBeGreaterThan(0);
  });

  it("returns null without impact node", () => {
    expect(
      buildGuideEarningsForecast({
        strongestImpactSkillNodeId: null,
        course: "AP CALCULUS AB",
        demandRows,
        openSlots: [],
        sessionsThisMonth: 0,
        sessionRatesCents: [],
        daysElapsedInMonth: 1,
      }),
    ).toBeNull();
  });
});

describe("averageGuideRateCents", () => {
  it("prefers completed session rates", () => {
    expect(averageGuideRateCents([5000, 3000], [{ price_per_session: 1000 }])).toBe(4000);
  });
});

describe("buildEarningsForecastLine legacy", () => {
  it("joins demand lines", () => {
    const line = buildEarningsForecastLine({
      strongestImpactSkillNodeId: "node-1",
      course: "AP CALCULUS AB",
      demandRows: [
        {
          skillNodeId: "node-1",
          subject: "AP CALCULUS AB",
          nodeName: "Chain rule",
          weakStudentCount: 8,
          weekStart: "2026-07-07",
        },
      ],
      openSlots: [{ course: "AP CALCULUS AB" }],
    });
    expect(line).toContain("Opening 7 more hours");
    expect(line).toContain("students in need.");
  });
});
