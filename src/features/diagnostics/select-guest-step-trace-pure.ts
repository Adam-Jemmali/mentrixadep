import { createHash } from "node:crypto";

export const GUEST_STEP_TRACE_PREFERRED_SLUGS = [
  "chain-rule-basics",
  "chain-rule-with-composite-functions",
  "limit-laws-and-algebraic-limits",
  "limits-by-algebraic-manipulation",
] as const;

export type GuestStepTracePickMeta = {
  unitNumber: number;
  nodeSlug?: string | null;
};

/** 1 = unit 1–3 + chain/limit slug, 2 = unit 1–3, 3 = fallback. */
export function guestStepTracePickTier(meta: GuestStepTracePickMeta): 1 | 2 | 3 {
  const slug = (meta.nodeSlug ?? "").toLowerCase();
  const inEarlyUnit = meta.unitNumber >= 1 && meta.unitNumber <= 3;
  const examFavorite =
    slug.includes("chain-rule") ||
    slug.includes("chain_rule") ||
    slug.includes("limit");

  if (inEarlyUnit && examFavorite) return 1;
  if (inEarlyUnit) return 2;
  return 3;
}

export function deterministicPickIndex(seed: string, count: number): number {
  if (count <= 0) return 0;
  const hash = createHash("sha256").update(seed).digest();
  return hash.readUInt32BE(0) % count;
}

export function pickDeterministicByTier<T extends GuestStepTracePickMeta>(
  items: T[],
  sessionSeed: string,
): T | null {
  if (items.length === 0) return null;

  const tiers: T[][] = [[], [], []];
  for (const item of items) {
    const tier = guestStepTracePickTier(item);
    tiers[tier - 1]!.push(item);
  }

  const pool = tiers.find((tier) => tier.length > 0) ?? items;
  const index = deterministicPickIndex(sessionSeed, pool.length);
  return pool[index] ?? null;
}
