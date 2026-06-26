import { describe, expect, it } from "vitest";
import {
  profileTabMessage,
  profileTabsAriaLabel,
  studioFilterTabMessage,
} from "@/shared/ui/tabs-messages-pure";

describe("tabs messages", () => {
  it("pairs profile identity tab with verdict copy", () => {
    const msg = profileTabMessage("identity");
    expect(msg.label).toBe("Identity");
    expect(msg.verdict).toMatch(/guide/i);
  });

  it("frames studio pending filter around transcript packages", () => {
    const msg = studioFilterTabMessage("pending");
    expect(msg.nextAction).toMatch(/transcript/i);
  });

  it("exposes profile tabs aria label", () => {
    expect(profileTabsAriaLabel()).toMatch(/profile/i);
  });
});
