import { describe, expect, it } from "vitest";
import {
  notificationSwitchGroupAriaLabel,
  notificationSwitchMessage,
  privacySwitchGroupAriaLabel,
  privacySwitchMessage,
  settingsSwitchMessage,
} from "@/shared/ui/switch-messages-pure";

describe("switch messages", () => {
  it("frames rank card around verified passport", () => {
    const msg = privacySwitchMessage("rank_card_public");
    expect(msg.verdict).toMatch(/verified first attempt/i);
    expect(msg.nextAction).toMatch(/peer standing/i);
  });

  it("differentiates tutor booked email copy", () => {
    const tutor = notificationSwitchMessage("email_session_booked", { isTutor: true });
    const student = notificationSwitchMessage("email_session_booked", { isTutor: false });
    expect(tutor.verdict).toMatch(/Mentrixer/i);
    expect(student.verdict).toMatch(/Guide/i);
  });

  it("routes settingsSwitchMessage to privacy branch", () => {
    const msg = settingsSwitchMessage("duel_opt_in");
    expect(msg.verdict).toMatch(/division standing/i);
  });

  it("exposes group aria labels", () => {
    expect(privacySwitchGroupAriaLabel()).toMatch(/privacy/i);
    expect(notificationSwitchGroupAriaLabel()).toMatch(/notification/i);
  });
});
