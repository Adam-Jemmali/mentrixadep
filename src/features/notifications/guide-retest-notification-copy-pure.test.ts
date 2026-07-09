import { describe, expect, it } from "vitest";
import { formatStudioRetestConfirmationLine } from "@/features/breakthrough-events/schedule-session-retests-pure";
import { buildGuideInterventionRetestNotificationBody } from "@/features/notifications/guide-retest-notification-copy-pure";

describe("formatStudioRetestConfirmationLine", () => {
  it("includes retest schedule and impact score follow-up", () => {
    const line = formatStudioRetestConfirmationLine(
      "Alex",
      "2026-07-10T12:00:00.000Z",
      3,
      () => "Jul 10",
    );
    expect(line).toBe(
      "Retest scheduled for Alex on Jul 10 across 3 skills. Your impact score will update when it completes.",
    );
  });
});

describe("buildGuideInterventionRetestNotificationBody", () => {
  it("formats movement from pre to post accuracy", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        preAccuracy: 62,
        postAccuracy: 74,
      }),
    ).toBe("Alex accuracy on Chain rule moved from 62% to 74% after your session and package");
  });

  it("formats a no-movement directive when post does not exceed pre", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        preAccuracy: 70,
        postAccuracy: 68,
      }),
    ).toBe(
      "Alex accuracy on Chain rule did not move. Consider addressing it differently next session.",
    );
  });
});
