import { describe, expect, it } from "vitest";
import {
  buildGuideInterventionRetestNotificationBody,
  buildStudentRetestPushBody,
  buildStudentRetestPushTitle,
  resolveGuideRetestNotificationTone,
} from "@/features/notifications/guide-retest-notification-copy-pure";
import {
  buildGuideRetestViewStudentHref,
  resolveRetestNotificationTone,
} from "@/features/notifications/notification-card-pure";

describe("buildStudentRetestPushTitle", () => {
  it("uses skill name in title", () => {
    expect(buildStudentRetestPushTitle("Chain rule")).toBe("Chain rule retest complete");
  });
});

describe("buildStudentRetestPushBody", () => {
  it("formats before and after accuracy", () => {
    expect(buildStudentRetestPushBody(62, 74)).toBe("Your accuracy moved from 62% to 74%");
  });
});

describe("buildGuideInterventionRetestNotificationBody", () => {
  it("formats gain copy when delta is at least 10", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        preAccuracy: 62,
        postAccuracy: 74,
        delta: 12,
      }),
    ).toBe("Alex accuracy on Chain rule moved from 62% to 74% after your session.");
  });

  it("formats decline directive when delta is negative", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        preAccuracy: 70,
        postAccuracy: 68,
        delta: -2,
      }),
    ).toBe("Consider a different approach on Chain rule.");
  });

  it("formats neutral movement when delta is below 10", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        preAccuracy: 70,
        postAccuracy: 74,
        delta: 4,
      }),
    ).toBe("Alex accuracy on Chain rule moved from 70% to 74%.");
  });
});

describe("resolveRetestNotificationTone", () => {
  it("maps delta thresholds to card tone", () => {
    expect(resolveRetestNotificationTone(12)).toBe("gain");
    expect(resolveRetestNotificationTone(-1)).toBe("warn");
    expect(resolveRetestNotificationTone(4)).toBe("neutral");
    expect(resolveGuideRetestNotificationTone(12)).toBe("gain");
  });
});

describe("buildGuideRetestViewStudentHref", () => {
  it("deep links to guide brief session", () => {
    expect(buildGuideRetestViewStudentHref("session-1")).toBe("/tutor?brief=session-1");
  });
});
