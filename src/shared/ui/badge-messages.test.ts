import { describe, expect, it } from "vitest";
import {
  badgeCountAriaLabel,
  formatBadgeCount,
} from "@/shared/ui/badge-messages-pure";

describe("badge messages", () => {
  it("hides zero and negative counts", () => {
    expect(formatBadgeCount(0)).toBeNull();
    expect(formatBadgeCount(-2)).toBeNull();
  });

  it("caps large counts at 99+", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(12)).toBe("12");
  });

  it("builds accessible labels for pending reviews", () => {
    expect(badgeCountAriaLabel(1, "pending review")).toBe("1 pending review");
    expect(badgeCountAriaLabel(3, "pending review")).toBe("3 pending reviews");
  });
});
