import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  applyVfaStreakOnSuccessfulInsert,
  calendarDateInTimeZone,
  resolveVfaStreakHomeDisplay,
  vfaStreakBrokenCopy,
  vfaStreakMilestonePeerContext,
  vfaStreakMilestoneTitle,
} from "@/features/vfa-streak/vfa-streak-pure";

describe("calendarDateInTimeZone", () => {
  it("formats a stable UTC date", () => {
    const d = new Date("2026-07-17T15:00:00.000Z");
    expect(calendarDateInTimeZone(d, "UTC")).toBe("2026-07-17");
  });
});

describe("applyVfaStreakOnSuccessfulInsert", () => {
  it("starts at 1 when no prior day", () => {
    const next = applyVfaStreakOnSuccessfulInsert(
      { streakDays: 0, lastDate: null, longest: 0 },
      "2026-07-17",
    );
    expect(next).toMatchObject({ streakDays: 1, lastDate: "2026-07-17", longest: 1, changed: true });
  });

  it("increments when last date was yesterday", () => {
    const next = applyVfaStreakOnSuccessfulInsert(
      { streakDays: 6, lastDate: "2026-07-16", longest: 6 },
      "2026-07-17",
    );
    expect(next.streakDays).toBe(7);
    expect(next.milestone).toBe(7);
    expect(next.longest).toBe(7);
  });

  it("no-ops when already counted today", () => {
    const next = applyVfaStreakOnSuccessfulInsert(
      { streakDays: 3, lastDate: "2026-07-17", longest: 5 },
      "2026-07-17",
    );
    expect(next.changed).toBe(false);
    expect(next.streakDays).toBe(3);
  });

  it("resets after a gap", () => {
    const next = applyVfaStreakOnSuccessfulInsert(
      { streakDays: 12, lastDate: "2026-07-10", longest: 12 },
      "2026-07-17",
    );
    expect(next.streakDays).toBe(1);
    expect(next.longest).toBe(12);
  });
});

describe("resolveVfaStreakHomeDisplay", () => {
  it("shows active when last date is today or yesterday", () => {
    expect(
      resolveVfaStreakHomeDisplay(
        { streakDays: 4, lastDate: "2026-07-17", longest: 4 },
        "2026-07-17",
      ),
    ).toEqual({ kind: "active", days: 4 });
    expect(
      resolveVfaStreakHomeDisplay(
        { streakDays: 4, lastDate: addCalendarDays("2026-07-17", -1), longest: 4 },
        "2026-07-17",
      ),
    ).toEqual({ kind: "active", days: 4 });
  });

  it("shows broken after a gap", () => {
    expect(
      resolveVfaStreakHomeDisplay(
        { streakDays: 9, lastDate: "2026-07-10", longest: 9 },
        "2026-07-17",
      ),
    ).toEqual({ kind: "broken", endedDays: 9 });
  });
});

describe("copy", () => {
  it("is factual and brief", () => {
    expect(vfaStreakBrokenCopy(9)).toBe("Your 9-day proof streak ended. Start a new one.");
    expect(vfaStreakMilestoneTitle(30)).toBe("30-day proof streak");
  });

  it("formats milestone peer context from percentile", () => {
    expect(vfaStreakMilestonePeerContext(92)).toBe("Top 8% of Mentrixers this month");
    expect(vfaStreakMilestonePeerContext(null)).toContain("verified board");
  });
});
