import { describe, expect, it } from "vitest";
import {
  buildPackSprintReceiptLine,
  buildPackSprintState,
  monthlyCreditExpiryMs,
  packSprintExpiryIso,
  selectCreditConsumeCandidate,
} from "@/features/entitlements/pack-sprint-pure";

describe("pack-sprint-pure", () => {
  it("expires pack credits 90 days after grant", () => {
    const granted = new Date("2026-01-01T12:00:00.000Z");
    expect(packSprintExpiryIso(granted)).toBe("2026-04-01T12:00:00.000Z");
  });

  it("formats sprint receipt line", () => {
    expect(
      buildPackSprintReceiptLine({
        creditsRemaining: 2,
        creditsGranted: 3,
        daysRemaining: 41,
      }),
    ).toBe("Sprint: 2 of 3 remaining, 41 days left");
  });

  it("consumes pack credit before monthly when pack expires sooner", () => {
    const nowMs = new Date("2026-03-01T00:00:00.000Z").getTime();
    const selected = selectCreditConsumeCandidate({
      nowMs,
      pack: {
        id: "pack-1",
        creditsRemaining: 2,
        expiresAt: "2026-03-20T12:00:00.000Z",
      },
      monthly: {
        id: "monthly-1",
        creditsRemaining: 1,
        periodMonth: "2026-03-01",
      },
    });
    expect(selected?.kind).toBe("pack");
    expect(selected?.id).toBe("pack-1");
  });

  it("consumes monthly credit when it expires before pack", () => {
    const nowMs = new Date("2026-03-25T00:00:00.000Z").getTime();
    const selected = selectCreditConsumeCandidate({
      nowMs,
      pack: {
        id: "pack-1",
        creditsRemaining: 3,
        expiresAt: "2026-06-01T12:00:00.000Z",
      },
      monthly: {
        id: "monthly-1",
        creditsRemaining: 1,
        periodMonth: "2026-03-01",
      },
    });
    expect(selected?.kind).toBe("monthly");
  });

  it("returns null pack sprint state when expired", () => {
    const state = buildPackSprintState({
      creditsRemaining: 1,
      creditsGranted: 3,
      expiresAt: "2026-01-01T00:00:00.000Z",
      nowMs: new Date("2026-02-01T00:00:00.000Z").getTime(),
    });
    expect(state).toBeNull();
  });

  it("monthly credit expires at end of UTC month", () => {
    const endMs = monthlyCreditExpiryMs("2026-03-01");
    expect(new Date(endMs).toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });
});
