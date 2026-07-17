import { describe, expect, it } from "vitest";
import {
  progressSnapshotEmailBody,
  progressSnapshotEmailSubject,
  progressSnapshotEmailTitle,
  type ProgressSnapshotEmailTemplateProps,
} from "./progress-snapshot-email";

const baseSnapshot: ProgressSnapshotEmailTemplateProps["snapshot"] = {
  firstName: "Alex",
  subject: "AP Calculus AB",
  divisionKey: "ap-calc-ab",
  rankChange: {
    direction: "up",
    previous: { level: 2, title: "Apprentice" },
    current: { level: 3, title: "Scholar" },
  },
  accuracyThisWeek: 72,
  accuracyDelta: 5,
  duelsWon: 2,
  duelsLost: 1,
  divisionRank: { current: 14, previous: 18, delta: 4 },
  weakestConcept: { label: "Chain rule", accuracyPercent: 45 },
  predictedNextRank: { title: "Expert", xpNeeded: 400, daysAtCurrentPace: 12 },
  recommendedGuide: {
    tutorId: "00000000-0000-4000-8000-000000000001",
    displayName: "Jordan",
    impactScore: 82,
    impactSubject: "AP Calculus AB",
    bookingUrl: "https://mentrixa.one/student/book/jordan",
  },
  bookingCtaUrl: "https://mentrixa.one/student/book/jordan",
};

describe("progressSnapshotEmailBody", () => {
  it("renders greeting and stats without verdict", () => {
    const html = progressSnapshotEmailBody({ snapshot: baseSnapshot });
    expect(html).toContain("Hi <strong");
    expect(html).toContain("Alex");
    expect(html).toContain("72% (+5% vs last week)");
    expect(html).toContain("2 won, 1 lost");
    expect(html).toContain("Book Jordan");
    expect(html).toContain("Supporting detail");
  });

  it("renders truth report before supporting metrics", () => {
    const html = progressSnapshotEmailBody({
      snapshot: baseSnapshot,
      truthReport: {
        moved: "Your accuracy on Chain Rule moved from 41 to 78 percent this week.",
        cause: "This followed a session with Jordan.",
        stuck: "No persistent blocks this week.",
        nextAction: "Verify Limits",
      },
    });
    const movedIdx = html.indexOf("Your accuracy on Chain Rule");
    const detailIdx = html.indexOf("Supporting detail");
    expect(movedIdx).toBeGreaterThan(-1);
    expect(detailIdx).toBeGreaterThan(movedIdx);
    expect(html).toContain("This followed a session with Jordan.");
    expect(html).toContain("No persistent blocks this week.");
    expect(html).toContain("Verify Limits");
    expect(html).toContain("72% (+5% vs last week)");
  });

  it("prefers truth report over weeklyVerdict opener", () => {
    const html = progressSnapshotEmailBody({
      snapshot: baseSnapshot,
      truthReport: {
        moved: "Your accuracy held steady.",
        cause: "Consistent practice drove this.",
        stuck: "No persistent blocks this week.",
        nextAction: "Run a verified pack",
      },
      weeklyVerdict: {
        changed: "You verified 2 new skills this week.",
        reason: "Both were first answers above 70%.",
        nextAction: { label: "Keep your streak", href: "/student/quest" },
      },
    });
    expect(html).toContain("Your accuracy held steady.");
    expect(html).not.toContain("You verified 2 new skills this week.");
  });

  it("renders verdict block when weeklyVerdict is provided", () => {
    const html = progressSnapshotEmailBody({
      snapshot: baseSnapshot,
      weeklyVerdict: {
        changed: "You verified 2 new skills this week.",
        reason: "Both were first answers above 70%.",
        nextAction: { label: "Keep your streak", href: "/student/quest" },
      },
    });
    expect(html).toContain("You verified 2 new skills this week.");
    expect(html).toContain("Both were first answers above 70%.");
    expect(html).toContain("/student/quest");
    expect(html).toContain("Keep your streak");
  });

  it("escapes HTML in user-controlled fields", () => {
    const html = progressSnapshotEmailBody({
      snapshot: {
        ...baseSnapshot,
        firstName: '<script>alert("x")</script>',
        subject: "AP &amp; Calc",
      },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders without throwing for zero weekly activity", () => {
    const snapshot: ProgressSnapshotEmailTemplateProps["snapshot"] = {
      ...baseSnapshot,
      accuracyThisWeek: 0,
      accuracyDelta: 0,
      duelsWon: 0,
      duelsLost: 0,
      divisionRank: { current: 1, previous: 1, delta: 0 },
      rankChange: {
        direction: "same",
        previous: { level: 1, title: "Wanderer" },
        current: { level: 1, title: "Wanderer" },
      },
      weakestConcept: { label: "No verified nodes yet", accuracyPercent: 0 },
      predictedNextRank: { title: "Seeker", xpNeeded: 100, daysAtCurrentPace: null },
    };
    expect(() => progressSnapshotEmailBody({ snapshot })).not.toThrow();
    const html = progressSnapshotEmailBody({ snapshot });
    expect(html).toContain("0% (0% vs last week)");
    expect(html).toContain("0 won, 0 lost");
  });

  it("renders without throwing for partial weekly history", () => {
    const snapshot: ProgressSnapshotEmailTemplateProps["snapshot"] = {
      ...baseSnapshot,
      accuracyThisWeek: 50,
      accuracyDelta: -10,
      duelsWon: 0,
      duelsLost: 1,
      divisionRank: { current: 42, previous: 40, delta: -2 },
      rankChange: {
        direction: "same",
        previous: { level: 2, title: "Seeker" },
        current: { level: 2, title: "Seeker" },
      },
    };
    expect(() =>
      progressSnapshotEmailBody({
        snapshot,
        weeklyVerdict: {
          changed: "You logged practice but no new verified skills.",
          reason: "Rank still moves on first answers only.",
          nextAction: { label: "Run a verified pack", href: "/student/quest" },
        },
      }),
    ).not.toThrow();
  });

  it("renders full history with verdict as primary block", () => {
    const html = progressSnapshotEmailBody({
      snapshot: baseSnapshot,
      weeklyVerdict: {
        changed: "You moved up one rank this week.",
        reason: "XP and verified accuracy both improved.",
        nextAction: { label: "Book your Guide", href: "/student/book" },
      },
    });
    const verdictIdx = html.indexOf("You moved up one rank this week.");
    const detailIdx = html.indexOf("Supporting detail");
    expect(verdictIdx).toBeGreaterThan(-1);
    expect(detailIdx).toBeGreaterThan(verdictIdx);
  });
});

describe("progressSnapshotEmailSubject", () => {
  it("reflects rank direction in subject line", () => {
    expect(progressSnapshotEmailSubject({ snapshot: baseSnapshot })).toBe(
      "Alex — your rank moved up this week",
    );
    expect(
      progressSnapshotEmailSubject({
        snapshot: {
          ...baseSnapshot,
          rankChange: { ...baseSnapshot.rankChange, direction: "down" },
        },
      }),
    ).toBe("Alex — your rank moved down this week");
    expect(
      progressSnapshotEmailSubject({
        snapshot: {
          ...baseSnapshot,
          rankChange: { ...baseSnapshot.rankChange, direction: "same" },
        },
      }),
    ).toBe("Alex — your weekly progress snapshot");
  });
});

describe("progressSnapshotEmailTitle", () => {
  it("includes subject name", () => {
    expect(progressSnapshotEmailTitle({ snapshot: baseSnapshot })).toBe(
      "Your week in AP Calculus AB",
    );
  });
});
