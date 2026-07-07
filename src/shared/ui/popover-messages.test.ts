import { describe, expect, it } from "vitest";
import { splitSessionPriceCents } from "@/features/booking/booking-pricing";
import {
  masteryNodeDetailPopoverMessage,
  priceBreakdownPopoverMessage,
  rankBreakdownPopoverMessage,
} from "@/shared/ui/popover-messages-pure";

describe("popover messages", () => {
  it("builds rank breakdown rows with peer standing gate", () => {
    const msg = rankBreakdownPopoverMessage({
      verifiedCount: 3,
      accuracyPercent: 72,
      percentile: null,
    });
    expect(msg.verdict).toMatch(/2 right out of 3 first answers/i);
    expect(msg.nextAction).toMatch(/verify 2 more/i);
  });

  it("includes stripe total in price breakdown verdict", () => {
    const split = splitSessionPriceCents(3900);
    const msg = priceBreakdownPopoverMessage(split);
    expect(msg.verdict).toMatch(/\$39\.00/);
  });

  it("locks verified nodes as rank-critical", () => {
    const msg = masteryNodeDetailPopoverMessage("Limits", "verified", 100);
    expect(msg.verdict).toMatch(/locked for rank/i);
  });
});
