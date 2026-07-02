import { describe, expect, it } from "vitest";
import {
  buildCreditEscalationCopy,
  resolveCreditEscalationVariant,
  resolveCreditEscalationVariantForWeeklyRun,
  utcLastDayOfMonth,
} from "@/features/entitlements/credit-escalation-pure";

describe("resolveCreditEscalationVariant", () => {
  it("returns credit_live on day 1", () => {
    expect(resolveCreditEscalationVariant(new Date("2026-07-01T12:00:00.000Z"))).toBe("credit_live");
  });

  it("returns credit_nudge on day 20", () => {
    expect(resolveCreditEscalationVariant(new Date("2026-07-20T12:00:00.000Z"))).toBe("credit_nudge");
  });

  it("returns credit_last_day on final day of month", () => {
    const lastDay = utcLastDayOfMonth(new Date("2026-07-15T12:00:00.000Z"));
    expect(
      resolveCreditEscalationVariant(new Date(`2026-07-${String(lastDay).padStart(2, "0")}T12:00:00.000Z`)),
    ).toBe("credit_last_day");
  });

  it("returns null on ordinary days", () => {
    expect(resolveCreditEscalationVariant(new Date("2026-07-10T12:00:00.000Z"))).toBeNull();
  });
});

describe("resolveCreditEscalationVariantForWeeklyRun", () => {
  it("catches month-start window on day 5", () => {
    expect(resolveCreditEscalationVariantForWeeklyRun(new Date("2026-07-05T12:00:00.000Z"))).toBe(
      "credit_live",
    );
  });

  it("catches mid-month window", () => {
    expect(resolveCreditEscalationVariantForWeeklyRun(new Date("2026-07-22T12:00:00.000Z"))).toBe(
      "credit_nudge",
    );
  });
});

describe("buildCreditEscalationCopy", () => {
  it("includes verdict and next action for day 1", () => {
    const copy = buildCreditEscalationCopy({
      variant: "credit_live",
      firstName: "Alex",
      creditsRemaining: 1,
      periodMonth: "2026-07-01",
      creditExpiryLabel: "July 31",
    });
    expect(copy.subject).toContain("Alex");
    expect(copy.verdict).toContain("coaching beat is live");
    expect(copy.nextAction).toContain("July 31");
  });

  it("includes open slots and weakest node on day 20", () => {
    const copy = buildCreditEscalationCopy({
      variant: "credit_nudge",
      firstName: "Alex",
      creditsRemaining: 1,
      periodMonth: "2026-07-01",
      creditExpiryLabel: "July 31",
      weakestNodeName: "Chain rule",
      openSlotCount: 5,
    });
    expect(copy.verdict).toContain("Chain rule");
    expect(copy.verdict).toContain("5 open Guide slots");
  });
});
