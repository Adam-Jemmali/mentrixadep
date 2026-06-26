import { describe, expect, it } from "vitest";
import {
  examStakesDisclosureMessage,
  guideImpactDisclosureMessage,
  mentrixaDisclosureMessage,
  momentumSubscriptionDisclosureMessage,
  verifiedFirstAttemptDisclosureMessage,
} from "@/shared/ui/disclosure-messages-pure";

describe("disclosure messages", () => {
  it("frames verified first attempt as permanent rank proof", () => {
    const msg = verifiedFirstAttemptDisclosureMessage("AP Calculus AB");
    expect(msg.triggerLabel).toMatch(/verified first attempt/i);
    expect(msg.body).toMatch(/AP Calculus AB/i);
    expect(msg.verdict).toMatch(/never rewrites rank/i);
  });

  it("keeps guide impact on first-attempt lift", () => {
    const msg = guideImpactDisclosureMessage();
    expect(msg.body).toMatch(/first-attempt lift/i);
    expect(msg.nextAction).toMatch(/first attempt/i);
  });

  it("includes exam stakes detail in body", () => {
    const msg = examStakesDisclosureMessage("Limits appear on both MCQ sections.");
    expect(msg.body).toContain("Limits appear on both MCQ sections.");
  });

  it("routes momentum subscription copy through pricing verdict", () => {
    const msg = momentumSubscriptionDisclosureMessage();
    expect(msg.body).toMatch(/paywall/i);
    expect(mentrixaDisclosureMessage("momentum_subscription").triggerLabel).toBe(msg.triggerLabel);
  });
});
