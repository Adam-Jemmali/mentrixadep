import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/**
 * One rendered icon per product noun. Aliases (bento-*, arena, division, etc.)
 * resolve here so MentrixaVocabIcon always shows the same glyph for the same concept.
 *
 * `practice-pack` stays distinct from `quest` — it marks mastery proficiency state,
 * not the Quest product surface.
 */
export const CANONICAL_QUEST_ICON: VocabIconName = "quest";
export const CANONICAL_DUELS_ICON: VocabIconName = "duels";
export const CANONICAL_LEAGUE_ICON: VocabIconName = "league";
export const CANONICAL_SKILLS_ICON: VocabIconName = "skills";
export const CANONICAL_MASTERY_GRID_ICON: VocabIconName = "mastery-grid";
export const CANONICAL_RECEIPT_ICON: VocabIconName = "receipt";
export const CANONICAL_SESSION_ICON: VocabIconName = "session";
export const CANONICAL_ARENA_TIER_ICON: VocabIconName = "tier-arena";
export const CANONICAL_MOMENTUM_ICON: VocabIconName = "tier-momentum";
export const CANONICAL_RANK_PROOF_ICON: VocabIconName = "rank-proof";
export const CANONICAL_IMPACT_SCORE_ICON: VocabIconName = "impact-score";
export const CANONICAL_BREAKTHROUGH_ICON: VocabIconName = "tier-breakthrough";
export const CANONICAL_LOOP_REPORT_ICON: VocabIconName = "loop-report";
export const CANONICAL_BOOKING_ICON: VocabIconName = "booking";
export const CANONICAL_BRIEF_ICON: VocabIconName = "brief";
export const CANONICAL_PROFILE_ICON: VocabIconName = "profile";

export const CANONICAL_PRODUCT_ICONS = {
  quest: CANONICAL_QUEST_ICON,
  duels: CANONICAL_DUELS_ICON,
  league: CANONICAL_LEAGUE_ICON,
} as const satisfies Record<string, VocabIconName>;

/** Non-canonical registry keys → single canonical icon per noun. */
const VOCAB_ICON_ALIAS: Partial<Record<VocabIconName, VocabIconName>> = {
  "bento-quest-practice": CANONICAL_QUEST_ICON,
  retest: CANONICAL_QUEST_ICON,

  "bento-skill-duels": CANONICAL_DUELS_ICON,
  "division-war": CANONICAL_DUELS_ICON,

  arena: CANONICAL_ARENA_TIER_ICON,
  division: CANONICAL_LEAGUE_ICON,
  leaderboard: CANONICAL_LEAGUE_ICON,
  "bento-division-leaderboard": CANONICAL_LEAGUE_ICON,
  "flow-climb": CANONICAL_LEAGUE_ICON,

  "skill-tree": CANONICAL_SKILLS_ICON,
  "skill-node": CANONICAL_SKILLS_ICON,

  "grid-timeline": CANONICAL_MASTERY_GRID_ICON,
  "progress-snapshot": CANONICAL_MASTERY_GRID_ICON,
  "progress-archive": CANONICAL_MASTERY_GRID_ICON,

  "movement-receipt": CANONICAL_RECEIPT_ICON,

  "guide-session": CANONICAL_SESSION_ICON,
  "bento-session-room": CANONICAL_SESSION_ICON,
  guide: CANONICAL_SESSION_ICON,
  "flow-meet": CANONICAL_SESSION_ICON,
  "session-credit": CANONICAL_SESSION_ICON,
  "bento-guide-studio": CANONICAL_SESSION_ICON,

  breakthrough: CANONICAL_BREAKTHROUGH_ICON,
  momentum: CANONICAL_MOMENTUM_ICON,
  "momentum-membership": CANONICAL_MOMENTUM_ICON,
  "momentum-pack": CANONICAL_MOMENTUM_ICON,
  membership: CANONICAL_MOMENTUM_ICON,

  "bento-rank-card": CANONICAL_RANK_PROOF_ICON,
  passport: CANONICAL_RANK_PROOF_ICON,
  standing: CANONICAL_RANK_PROOF_ICON,
  percentile: CANONICAL_RANK_PROOF_ICON,
  "trajectory-certificate": CANONICAL_RANK_PROOF_ICON,

  "guide-impact-receipt": CANONICAL_IMPACT_SCORE_ICON,

  "bento-breakthrough-events": CANONICAL_BREAKTHROUGH_ICON,

  "loop-sla": CANONICAL_LOOP_REPORT_ICON,

  "flow-book": CANONICAL_BOOKING_ICON,
  "flow-unpack": CANONICAL_BRIEF_ICON,
  "study-package": CANONICAL_BRIEF_ICON,

  identity: CANONICAL_PROFILE_ICON,
  share: CANONICAL_PROFILE_ICON,
};

export function resolveCanonicalVocabIcon(name: VocabIconName): VocabIconName {
  let current = name;
  const seen = new Set<VocabIconName>();

  while (VOCAB_ICON_ALIAS[current] && !seen.has(current)) {
    seen.add(current);
    current = VOCAB_ICON_ALIAS[current]!;
  }

  return current;
}

/** All alias keys grouped by their resolved canonical icon (for tests). */
export function vocabIconAliasGroups(): Map<VocabIconName, VocabIconName[]> {
  const groups = new Map<VocabIconName, VocabIconName[]>();

  for (const [alias, canonical] of Object.entries(VOCAB_ICON_ALIAS) as Array<
    [VocabIconName, VocabIconName]
  >) {
    const resolved = resolveCanonicalVocabIcon(canonical);
    const list = groups.get(resolved) ?? [];
    list.push(alias);
    groups.set(resolved, list);
  }

  return groups;
}
