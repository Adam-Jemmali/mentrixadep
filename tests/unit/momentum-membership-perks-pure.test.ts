import { describe, expect, it } from "vitest";
import { buildMomentumMembershipExclusivePerks } from "@/features/payments/momentum-membership-perks-pure";

describe("buildMomentumMembershipExclusivePerks", () => {
  it("lists every Momentum-only row from the pricing comparison table", () => {
    const perks = buildMomentumMembershipExclusivePerks();
    expect(perks).toHaveLength(5);
    expect(perks.every((perk) => perk.feature.length > 0)).toBe(true);
    expect(perks.every((perk) => perk.memberValue.length > 0)).toBe(true);
    expect(perks.every((perk) => perk.href.startsWith("/"))).toBe(true);
    expect(new Set(perks.map((perk) => perk.id)).size).toBe(5);
  });

  it("includes only tangible membership perks", () => {
    const features = buildMomentumMembershipExclusivePerks().map((perk) => perk.feature);
    expect(features.some((f) => f.startsWith("Monthly session credit"))).toBe(true);
    expect(features).toContain("Weekly Movement Receipt");
    expect(features).toContain("Guide memory + brief archive");
    expect(features).toContain("Loop SLA credit restore");
    expect(features.some((f) => f.includes("Playbook"))).toBe(false);
    expect(features.some((f) => f.includes("Trajectory certificate"))).toBe(false);
  });
});
