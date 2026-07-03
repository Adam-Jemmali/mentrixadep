import type { PricingTierId } from "@/features/pricing/pricing-tiers-pure";
import {
  CANONICAL_ARENA_TIER_ICON,
  CANONICAL_BREAKTHROUGH_ICON,
  CANONICAL_MOMENTUM_ICON,
} from "@/shared/icons/vocab-canonical";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export const TIER_VOCAB_ICONS: Record<PricingTierId, VocabIconName> = {
  arena: CANONICAL_ARENA_TIER_ICON,
  breakthrough: CANONICAL_BREAKTHROUGH_ICON,
  momentum: CANONICAL_MOMENTUM_ICON,
};

/** Direct public paths to the three pricing tier sticker SVGs. */
export const TIER_ICON_SRC: Record<PricingTierId, string> = {
  arena: "/icons/vocab/tier-arena.svg",
  breakthrough: "/icons/vocab/tier-breakthrough.svg",
  momentum: "/icons/vocab/tier-momentum.svg",
};

export function tierIconSrc(tier: PricingTierId): string {
  return TIER_ICON_SRC[tier];
}

export function tierIconSrcForVocabName(name: VocabIconName): string | null {
  if (name === CANONICAL_ARENA_TIER_ICON) return TIER_ICON_SRC.arena;
  if (name === CANONICAL_BREAKTHROUGH_ICON) return TIER_ICON_SRC.breakthrough;
  if (name === CANONICAL_MOMENTUM_ICON) return TIER_ICON_SRC.momentum;
  return null;
}
