/** Platform fee retained by Mentrixa from tutor-side settlement (15% in bps). */
export const PLATFORM_FEE_BPS = 1500;

/** Reduced platform fee for bundle purchases (10% in bps). */
export const BUNDLE_PLATFORM_FEE_BPS = 1000;

export type BundleSize = 3 | 5;

export interface BundleConfig {
  size: BundleSize;
  platformFeeBps: number;
  discountLabel: string;
}

export const BUNDLE_OPTIONS: Record<BundleSize, BundleConfig> = {
  3: { size: 3, platformFeeBps: BUNDLE_PLATFORM_FEE_BPS, discountLabel: "Save 10% on platform fee" },
  5: { size: 5, platformFeeBps: BUNDLE_PLATFORM_FEE_BPS, discountLabel: "Save 15% on platform fee" },
};

export type SessionPriceSplit = {
  /** Guide session price in cents (from availability.price_per_session). */
  sessionCents: number;
  /** Mentrixa platform fee in cents (15% of session, rounded). */
  platformFeeCents: number;
  /** Total charged to student via Stripe (Model A: base session only). */
  totalCents: number;
};

export function splitSessionPriceCents(sessionCents: number, bundleSize?: BundleSize): SessionPriceSplit {
  const base = Math.max(0, Math.round(sessionCents));
  const feeBps = bundleSize ? (BUNDLE_OPTIONS[bundleSize]?.platformFeeBps ?? PLATFORM_FEE_BPS) : PLATFORM_FEE_BPS;
  const platformFeeCents = Math.round((base * feeBps) / 10_000);
  return {
    sessionCents: base,
    platformFeeCents,
    totalCents: base,
  };
}

export interface BundlePriceSplit {
  perSessionCents: number;
  bundleSize: BundleSize;
  platformFeeCentsPerSession: number;
  totalPlatformFeeCents: number;
  totalChargedCents: number;
  savingsVsSingleCents: number;
}

export function computeBundlePrice(perSessionCents: number, bundleSize: BundleSize): BundlePriceSplit {
  const single = splitSessionPriceCents(perSessionCents);
  const bundled = splitSessionPriceCents(perSessionCents, bundleSize);

  const totalPlatformFeeCents = bundled.platformFeeCents * bundleSize;
  const totalChargedCents = bundled.totalCents * bundleSize;
  const savingsVsSingleCents = (single.platformFeeCents - bundled.platformFeeCents) * bundleSize;

  return {
    perSessionCents,
    bundleSize,
    platformFeeCentsPerSession: bundled.platformFeeCents,
    totalPlatformFeeCents,
    totalChargedCents,
    savingsVsSingleCents,
  };
}

/** Upper bound for “bookable window” queries (e.g. next 14 days of slots). */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
