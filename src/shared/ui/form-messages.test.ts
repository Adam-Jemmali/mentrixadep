import { describe, expect, it } from "vitest";
import {
  adminFieldMessage,
  contactFormFieldMessage,
  settingsPasswordFieldMessage,
  settingsProfileFieldMessage,
  validateEmailAddress,
  validateMfaCode,
  validateNewPassword,
} from "@/shared/ui/form-messages-pure";

describe("form messages", () => {
  it("frames profile display name around public card", () => {
    const msg = settingsProfileFieldMessage("display_name");
    expect(msg.verdict).toMatch(/public card/i);
    expect(msg.nextAction).toMatch(/recognize/i);
  });

  it("frames password confirmation as typo guard", () => {
    const msg = settingsPasswordFieldMessage("confirm_password");
    expect(msg.verdict).toMatch(/typos/i);
  });

  it("routes contact message field to reproducible feedback", () => {
    const msg = contactFormFieldMessage("message");
    expect(msg.nextAction).toMatch(/screen/i);
  });

  it("frames admin mfa code as rotating", () => {
    const msg = adminFieldMessage("mfa_code");
    expect(msg.verdict).toMatch(/30 seconds/i);
  });

  it("validates email and password rules", () => {
    expect(validateEmailAddress("bad")).toMatch(/valid email/i);
    expect(validateEmailAddress("you@example.com")).toBeNull();
    expect(validateNewPassword("short")).toMatch(/8 characters/i);
    expect(validateNewPassword("Longpass1")).toBeNull();
    expect(validateMfaCode("12345")).toMatch(/6-digit/i);
    expect(validateMfaCode("123456")).toBeNull();
  });
});
