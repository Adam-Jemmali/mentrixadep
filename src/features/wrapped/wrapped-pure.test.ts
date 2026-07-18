import { describe, expect, it } from "vitest";
import {
  buildGuideWrappedData,
  buildStudentWrappedData,
  buildWrappedSlideCopy,
  buildWrappedSlideUrls,
  hasEnoughActivityDays,
  monthLabel,
  pickBestMonth,
  pickBreakthroughNode,
  pickHardestNode,
  pickHighestImpactNode,
  studentWrappedStatLines,
  guideWrappedStatLines,
  xpAtYearStart,
  yearWindowUtc,
} from "@/features/wrapped/wrapped-pure";

describe("wrapped pure", () => {
  it("requires 30 activity days", () => {
    expect(hasEnoughActivityDays(29)).toBe(false);
    expect(hasEnoughActivityDays(30)).toBe(true);
  });

  it("builds year window through Dec 15", () => {
    const w = yearWindowUtc(2026);
    expect(w.startIso.startsWith("2026-01-01")).toBe(true);
    expect(w.endIso.startsWith("2026-12-15")).toBe(true);
  });

  it("computes XP at year start", () => {
    expect(xpAtYearStart({ currentTotalXp: 500, awardsOnOrAfterYearStart: 120 })).toBe(380);
  });

  it("picks hardest proficient node by attempts", () => {
    expect(
      pickHardestNode([
        { nodeName: "Chain rule", attempts: 12, proficient: true },
        { nodeName: "Limits", attempts: 40, proficient: true },
        { nodeName: "Integrals", attempts: 99, proficient: false },
      ]),
    ).toEqual({ nodeName: "Limits", attempts: 40 });
  });

  it("picks breakthrough and best month", () => {
    expect(
      pickBreakthroughNode([
        { nodeName: "A", deltaPoints: 10, beforePct: 40, afterPct: 50 },
        { nodeName: "B", deltaPoints: 22, beforePct: 30, afterPct: 52 },
      ]),
    ).toEqual({
      nodeName: "B",
      deltaPoints: 22,
      beforePct: 30,
      afterPct: 52,
      dateLabel: null,
    });

    expect(
      pickBestMonth([
        "2026-03-01T00:00:00.000Z",
        "2026-03-02T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
      ]),
    ).toEqual({ month: 3, vfaCount: 2 });
    expect(monthLabel(3)).toBe("Mar");
  });

  it("builds five brief slide copies with icons", () => {
    const student = buildStudentWrappedData({
      hardest: { nodeName: "Limits", attempts: 14 },
      breakthrough: {
        nodeName: "Chain rule",
        deltaPoints: 31,
        beforePct: 40,
        afterPct: 71,
        dateLabel: "Jun 12, 2026",
      },
      bestMonth: { month: 7, vfaCount: 9 },
      rankStartXp: 0,
      rankEndXp: 900,
      guideSessionsCount: 4,
      bestSessionDelta: { nodeName: "Chain rule", deltaPoints: 18 },
      vfaStreakLongest: 11,
      totalNodesVerified: 22,
    });
    const slides = buildWrappedSlideCopy({
      reportYear: 2026,
      data: student,
      rankUsername: "alex",
    });
    expect(slides).toHaveLength(5);
    expect(slides[0]?.title).toContain("2026");
    expect(slides[1]?.title).toContain("Limits");
    expect(slides[1]?.title).toContain("14");
    expect(slides[2]?.title).toContain("40%");
    expect(slides[3]?.title).toContain("January");
    expect(slides[3]?.body).toContain("22 skills");
    expect(slides[4]?.footer).toBe("mentrixa.one/rank/alex");
    expect(slides.every((s) => s.eyebrowIcon && s.title && s.body)).toBe(true);
    expect(buildWrappedSlideUrls("https://mentrixa.one", "tok")).toHaveLength(5);
  });

  it("builds student and guide payloads with brief lines", () => {
    const student = buildStudentWrappedData({
      hardest: { nodeName: "Limits", attempts: 14 },
      breakthrough: {
        nodeName: "Chain rule",
        deltaPoints: 31,
        beforePct: 40,
        afterPct: 71,
        dateLabel: "Jun 12, 2026",
      },
      bestMonth: { month: 7, vfaCount: 9 },
      rankStartXp: 0,
      rankEndXp: 900,
      guideSessionsCount: 4,
      bestSessionDelta: { nodeName: "Chain rule", deltaPoints: 18 },
      vfaStreakLongest: 11,
      totalNodesVerified: 22,
    });
    expect(student.kind).toBe("student");
    expect(student.rank_start).toBeTruthy();
    expect(studentWrappedStatLines(student).length).toBeGreaterThan(4);
    expect(studentWrappedStatLines(student).every((l) => l.icon && l.value)).toBe(true);

    const guide = buildGuideWrappedData({
      studentsHelped: 8,
      totalBreakthroughs: 5,
      highestImpactNode: pickHighestImpactNode([
        { nodeName: "Limits", avgDelta: 12 },
        { nodeName: "Series", avgDelta: 19 },
      ]),
      totalEarningsCents: 45000,
    });
    expect(guide.highest_impact_node?.nodeName).toBe("Series");
    expect(guideWrappedStatLines(guide).some((l) => l.value.includes("450"))).toBe(true);
  });
});
