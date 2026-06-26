import { describe, expect, it } from "vitest";
import {
  adminNumberFieldMessage,
  guideSessionNumberFieldMessage,
  validateAdminQuestsPerDay,
  validatePlatformFeePercent,
  validateSessionBufferMinutes,
  validateSessionDurationMinutes,
} from "@/shared/ui/number-field-messages-pure";
import { mentrixaSeparatorAriaLabel } from "@/shared/ui/separator-messages-pure";

describe("number field messages", () => {
  it("frames admin quest cap around item bank load", () => {
    const msg = adminNumberFieldMessage("max_quests_per_day");
    expect(msg.verdict).toMatch(/item bank/i);
    expect(msg.nextAction).toMatch(/reviewed pack/i);
  });

  it("frames platform fee as payout split", () => {
    const msg = adminNumberFieldMessage("platform_fee_percent");
    expect(msg.verdict).toMatch(/Mentrixa take/i);
  });

  it("frames guide session duration as availability default", () => {
    const msg = guideSessionNumberFieldMessage("session_default_duration");
    expect(msg.nextAction).toMatch(/one sitting/i);
  });

  it("validates admin and guide numeric ranges", () => {
    expect(validateAdminQuestsPerDay(0)).toMatch(/at least 1/i);
    expect(validateAdminQuestsPerDay(10)).toBeNull();
    expect(validatePlatformFeePercent(51)).toMatch(/50%/i);
    expect(validateSessionDurationMinutes(20)).toMatch(/15-minute/i);
    expect(validateSessionDurationMinutes(60)).toBeNull();
    expect(validateSessionBufferMinutes(7)).toMatch(/5-minute/i);
    expect(validateSessionBufferMinutes(15)).toBeNull();
  });
});

describe("separator messages", () => {
  it("labels dashboard dividers for screen readers", () => {
    expect(mentrixaSeparatorAriaLabel("dashboard")).toMatch(/divider/i);
  });
});
