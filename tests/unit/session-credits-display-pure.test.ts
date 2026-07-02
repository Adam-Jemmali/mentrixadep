import { describe, expect, it } from "vitest";
import { buildSessionCreditsHubVerdict } from "@/features/entitlements/session-credits-display-pure";

describe("buildSessionCreditsHubVerdict", () => {
  it("prioritizes sprint pack in verdict", () => {
    const copy = buildSessionCreditsHubVerdict({
      totalRemaining: 3,
      monthlyRemaining: 1,
      packSprint: {
        creditsRemaining: 2,
        creditsGranted: 3,
        daysRemaining: 41,
        expiresAt: "2026-08-01T00:00:00.000Z",
      },
      periodMonth: "2026-07-01",
    });
    expect(copy?.verdict).toContain("Sprint: 2 of 3 remaining, 41 days left");
    expect(copy?.nextAction).toContain("sprint session");
  });
});
