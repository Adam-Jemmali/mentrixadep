/** Platform fee: 5% of the Guide’s session price (basis points). */
export const PLATFORM_FEE_BPS = 500;

export type SessionPriceSplit = {
  /** Guide session price in cents (from availability.price_per_session). */
  sessionCents: number;
  /** Mentrixa platform fee in cents (5% of session, rounded). */
  platformFeeCents: number;
  /** Total charged via Stripe (session + platform fee). */
  totalCents: number;
};

export function splitSessionPriceCents(sessionCents: number): SessionPriceSplit {
  const base = Math.max(0, Math.round(sessionCents));
  const platformFeeCents = Math.round((base * PLATFORM_FEE_BPS) / 10_000);
  return {
    sessionCents: base,
    platformFeeCents,
    totalCents: base + platformFeeCents,
  };
}

/** Upper bound for “bookable window” queries (e.g. next 14 days of slots). */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
