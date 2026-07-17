import { describe, expect, it } from "vitest";
import {
  daysSinceProof,
  decayAlertPushCopy,
  hoursUntilDecay,
  isDecayAlertEligibleState,
  isWithinDecayAlertWindow,
  shouldSendDecayAlert,
} from "@/features/mastery-decay/decay-alerts-pure";

describe("decay alerts pure", () => {
  it("only alerts verified or proficient", () => {
    expect(isDecayAlertEligibleState("verified")).toBe(true);
    expect(isDecayAlertEligibleState("proficient")).toBe(true);
    expect(isDecayAlertEligibleState("weak")).toBe(false);
  });

  it("detects the 24h pre decay window", () => {
    const now = new Date("2026-07-17T07:00:00.000Z");
    expect(
      isWithinDecayAlertWindow(new Date("2026-07-18T06:00:00.000Z"), now),
    ).toBe(true);
    expect(
      isWithinDecayAlertWindow(new Date("2026-07-19T08:00:00.000Z"), now),
    ).toBe(false);
    expect(
      isWithinDecayAlertWindow(new Date("2026-07-17T06:00:00.000Z"), now),
    ).toBe(false);
  });

  it("resends only after six days", () => {
    const now = new Date("2026-07-17T07:00:00.000Z");
    expect(shouldSendDecayAlert(null, now)).toBe(true);
    expect(shouldSendDecayAlert("2026-07-16T07:00:00.000Z", now)).toBe(false);
    expect(shouldSendDecayAlert("2026-07-10T07:00:00.000Z", now)).toBe(true);
  });

  it("builds brief push copy without parentheses", () => {
    const copy = decayAlertPushCopy({
      nodeName: "Chain Rule",
      daysAgo: 12,
      hoursLeft: 9,
    });
    expect(copy.title).toBe("Chain Rule is at risk");
    expect(copy.body).toBe(
      "Verified 12d ago. Retest keeps Gold. 9h left.",
    );
    expect(copy.body).not.toMatch(/[()]/);
    expect(hoursUntilDecay(new Date("2026-07-17T10:00:00.000Z"), new Date("2026-07-17T07:00:00.000Z"))).toBe(3);
    expect(daysSinceProof(new Date("2026-07-10T07:00:00.000Z"), new Date("2026-07-17T07:00:00.000Z"))).toBe(7);
  });
});
