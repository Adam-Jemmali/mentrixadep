import { describe, expect, it } from "vitest";
import {
  examStakesDisclosureMessage,
  guideImpactDisclosureMessage,
  mentrixaDisclosureMessage,
  momentumSubscriptionDisclosureMessage,
  verifiedFirstAttemptDisclosureMessage,
} from "@/shared/ui/disclosure-messages-pure";

const FOUR_WORD_MAX = /^\S+(?:\s+\S+){0,3}$/;

function expectAtMostFourWords(value: string): void {
  expect(value.trim()).toMatch(FOUR_WORD_MAX);
}

describe("disclosure messages", () => {
  it("keeps verified first attempt copy at four words max", () => {
    const msg = verifiedFirstAttemptDisclosureMessage("AP Calculus AB");
    expectAtMostFourWords(msg.triggerLabel);
    expectAtMostFourWords(msg.body);
    expectAtMostFourWords(msg.verdict);
    expectAtMostFourWords(msg.nextAction);
    expect(msg.triggerLabel).toMatch(/verified attempt/i);
    expect(msg.body).toMatch(/AP Calculus AB/i);
    expect(msg.verdict).toMatch(/never rewrites rank/i);
  });

  it("keeps guide impact copy at four words max", () => {
    const msg = guideImpactDisclosureMessage();
    expectAtMostFourWords(msg.triggerLabel);
    expectAtMostFourWords(msg.body);
    expectAtMostFourWords(msg.verdict);
    expectAtMostFourWords(msg.nextAction);
    expect(msg.body).toMatch(/verified rank/i);
  });

  it("truncates exam stakes body to four words", () => {
    const msg = examStakesDisclosureMessage("Limits appear on both MCQ sections.");
    expect(msg.body).toBe("Limits appear on both");
  });

  it("keeps momentum subscription copy at four words max", () => {
    const msg = momentumSubscriptionDisclosureMessage();
    expectAtMostFourWords(msg.triggerLabel);
    expectAtMostFourWords(msg.body);
    expectAtMostFourWords(msg.verdict);
    expectAtMostFourWords(msg.nextAction);
    expect(msg.body).toMatch(/paywall/i);
    expect(mentrixaDisclosureMessage("momentum_subscription").triggerLabel).toBe(msg.triggerLabel);
  });
});
