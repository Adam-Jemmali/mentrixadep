import { describe, expect, it } from "vitest";
import { buildGuideInterventionRetestNotificationBody } from "@/features/notifications/guide-retest-notification-copy-pure";

describe("buildGuideInterventionRetestNotificationBody", () => {
  it("formats an improvement message with rounded delta", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        delta: 12.4,
      }),
    ).toBe(
      "Your session with Alex improved their first-answer accuracy on Chain rule by 12 percentage points",
    );
  });

  it("formats a no-movement message when delta is zero or negative", () => {
    expect(
      buildGuideInterventionRetestNotificationBody({
        studentName: "Alex",
        nodeName: "Chain rule",
        delta: 0,
      }),
    ).toBe(
      "Your session with Alex did not move their accuracy on Chain rule. Consider a different approach next time.",
    );
  });
});
