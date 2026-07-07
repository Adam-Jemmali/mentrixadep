import { describe, expect, it } from "vitest";
import {
  mentrixaSpinnerMessage,
  questPackLoadSpinnerMessage,
  stripeCheckoutSpinnerMessage,
} from "@/shared/ui/spinner-messages-pure";

describe("spinner messages", () => {
  it("frames stripe checkout as pre-confirmation", () => {
    const msg = stripeCheckoutSpinnerMessage();
    expect(msg.title).toMatch(/stripe/i);
    expect(msg.verdict).toMatch(/no charge/i);
  });

  it("ties quest pack load to reviewed item bank", () => {
    const msg = questPackLoadSpinnerMessage();
    expect(msg.description).toMatch(/reviewed/i);
    expect(msg.nextAction).toMatch(/first answer/i);
  });

  it("routes kinds through mentrixaSpinnerMessage", () => {
    expect(mentrixaSpinnerMessage("quest_pack_load").ariaLabel).toMatch(/verified/i);
  });
});
