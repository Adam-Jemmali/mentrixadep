import { describe, expect, it } from "vitest";
import {
  billingIntervalRadioAriaLabel,
  billingIntervalRadioMessage,
  contactCategoryRadioAriaLabel,
  contactCategoryRadioMessage,
} from "@/shared/ui/radio-group-messages-pure";

describe("radio group messages", () => {
  it("states annual checkout charge before subscribe", () => {
    const msg = billingIntervalRadioMessage("annual");
    expect(msg.verdict).toMatch(/\$249 CAD per year/i);
    expect(msg.nextAction).toMatch(/guide session/i);
  });

  it("states monthly checkout charge before subscribe", () => {
    const msg = billingIntervalRadioMessage("monthly");
    expect(msg.verdict).toMatch(/\$29 CAD every month/i);
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
