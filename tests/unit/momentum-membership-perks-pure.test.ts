import { describe, expect, it } from "vitest";
import { buildMomentumMembershipExclusivePerks } from "@/features/payments/momentum-membership-perks-pure";

describe("buildMomentumMembershipExclusivePerks", () => {
  it("lists every Momentum-only row from the pricing comparison table", () => {
    const perks = buildMomentumMembershipExclusivePerks();
    expect(perks).toHaveLength(15);
    expect(perks.every((perk) => perk.feature.length > 0)).toBe(true);
    expect(perks.every((perk) => perk.memberValue.length > 0)).toBe(true);
    expect(perks.every((perk) => perk.href.startsWith("/"))).toBe(true);
    expect(new Set(perks.map((perk) => perk.id)).size).toBe(15);
  });

  it("includes core coaching and proof perks", () => {
    const features = buildMomentumMembershipExclusivePerks().map((perk) => perk.feature);
    expect(features.some((f) => f.startsWith("Monthly session credit"))).toBe(true);
    expect(features).toContain("Weekly Movement Receipt");
    expect(features).toContain("Proof Chain + Trajectory lift");
    expect(features).toContain("Loop SLA credit restore");
  });
});
