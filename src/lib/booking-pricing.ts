/** Platform fee retained by Mentrixa from tutor-side settlement (15% in bps). */
export const PLATFORM_FEE_BPS = 1500;

export type SessionPriceSplit = {
  /** Guide session price in cents (from availability.price_per_session). */
  sessionCents: number;
  /** Mentrixa platform fee in cents (15% of session, rounded). */
  platformFeeCents: number;
  /** Total charged to student via Stripe (Model A: base session only). */
  totalCents: number;
};

export function splitSessionPriceCents(sessionCents: number): SessionPriceSplit {
  const base = Math.max(0, Math.round(sessionCents));
  const platformFeeCents = Math.round((base * PLATFORM_FEE_BPS) / 10_000);
  return {
    sessionCents: base,
    platformFeeCents,
    // Model A: the learner is charged only the base session amount.
    totalCents: base,
  };
}

/** Upper bound for “bookable window” queries (e.g. next 14 days of slots). */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
