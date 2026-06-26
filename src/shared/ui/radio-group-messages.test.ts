import { describe, expect, it } from "vitest";
import {
  billingIntervalRadioAriaLabel,
  billingIntervalRadioMessage,
  contactCategoryRadioAriaLabel,
  contactCategoryRadioMessage,
} from "@/shared/ui/radio-group-messages-pure";

describe("radio group messages", () => {
  it("frames annual billing around lowest rate", () => {
    const msg = billingIntervalRadioMessage("annual");
    expect(msg.verdict).toMatch(/annual/i);
    expect(msg.nextAction).toMatch(/guide session/i);
  });

  it("asks bug reports for repro detail", () => {
    const msg = contactCategoryRadioMessage("bug");
    expect(msg.nextAction).toMatch(/browser/i);
  });

  it("exposes aria labels", () => {
    expect(billingIntervalRadioAriaLabel()).toMatch(/billing/i);
    expect(contactCategoryRadioAriaLabel()).toMatch(/category/i);
  });
});
