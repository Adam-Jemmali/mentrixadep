import { describe, expect, it } from "vitest";
import {
  sessionStatusChipPresentation,
  subscriptionTierChipPresentation,
} from "@/shared/ui/chip-messages-pure";

describe("chip messages", () => {
  it("maps scheduled sessions to accent status chips", () => {
    const chip = sessionStatusChipPresentation("scheduled");
    expect(chip.label).toBe("Scheduled");
    expect(chip.visual).toBe("accent");
  });

  it("maps rejected requests to danger chips", () => {
    const chip = sessionStatusChipPresentation("rejected");
    expect(chip.visual).toBe("danger");
  });

  it("keeps momentum tier on accent even when active", () => {
    const inactive = subscriptionTierChipPresentation("momentum");
    const active = subscriptionTierChipPresentation("momentum", { active: true });
    expect(inactive.visual).toBe("accent");
    expect(active.visual).toBe("accent");
    expect(active.label).toContain("Momentum membership member");
  });

  it("keeps arena tier on accent without verified gold", () => {
    const chip = subscriptionTierChipPresentation("arena");
    expect(chip.visual).toBe("accent");
    expect(chip.label).toBe("The Arena");
  });
});
