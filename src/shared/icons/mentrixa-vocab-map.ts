/**
 * Mentrixa product vocabulary icons.
 *
 * RULE: VocabIconName keys must render custom sticker SVGs from /public/icons/.
 * Do NOT map these keys to Lucide or other generic icon libraries.
 *
 * Student account ranks (Wanderer → Mentrixer) live in rank-icons.ts — not here.
 */

export type VocabIconCategory =
  | "nav"
  | "core"
  | "social"
  | "coaching"
  | "reports"
  | "profile"
  | "guide-rank"
  | "pricing"
  | "landing";

export type VocabIconName =
  // Navigation & shell
  | "home"
  | "skills"
  | "quest"
  | "league"
  | "duels"
  | "profile"
  | "settings"
  | "momentum-membership"
  // Core mechanics
  | "mastery-grid"
  | "skill-tree"
  | "skill-node"
  | "unit"
  | "verified"
  | "rank-proof"
  | "practice-pack"
  | "percentile"
  | "xp"
  | "streak"
  | "day"
  | "day-sun"
  | "day-mon"
  | "day-tue"
  | "day-wed"
  | "day-thu"
  | "day-fri"
  | "day-sat"
  | "focus-ring"
  | "status-scheduled"
  | "status-completed"
  | "status-cancelled"
  | "status-ended"
  | "status-pending"
  | "status-rejected"
  // Social & competition
  | "arena"
  | "division"
  | "leaderboard"
  | "rival"
  | "division-war"
  // Coaching & commerce
  | "guide"
  | "session"
  | "guide-session"
  | "breakthrough"
  | "momentum"
  | "momentum-pack"
  | "session-credit"
  | "booking"
  // Reports & archives
  | "receipt"
  | "movement-receipt"
  | "loop-report"
  | "loop-sla"
  | "impact-score"
  | "guide-impact-receipt"
  | "brief"
  | "study-package"
  | "progress-snapshot"
  | "progress-archive"
  | "grid-timeline"
  | "trajectory-certificate"
  | "retest"
  // Profile & share
  | "identity"
  | "membership"
  | "standing"
  | "share"
  | "passport"
  // Guide ranks (assets in /icons/guide-ranks/)
  | "practitioner"
  | "specialist"
  | "expert"
  | "master"
  | "elite"
  // Pricing tier marks
  | "tier-arena"
  | "tier-breakthrough"
  | "tier-momentum"
  // Landing bento & flow
  | "bento-skill-duels"
  | "bento-division-leaderboard"
  | "bento-quest-practice"
  | "bento-rank-card"
  | "bento-session-room"
  | "bento-guide-studio"
  | "bento-breakthrough-events"
  | "flow-book"
  | "flow-meet"
  | "flow-unpack"
  | "flow-climb";

export type VocabIconMeta = {
  name: VocabIconName;
  label: string;
  category: VocabIconCategory;
  /** When true, `gold` prop may apply verified-truth styling (#D4A017). */
  allowsGold?: boolean;
};

const GUIDE_RANK_NAMES = new Set<VocabIconName>([
  "practitioner",
  "specialist",
  "expert",
  "master",
  "elite",
]);

export function vocabIconSrc(name: VocabIconName): string {
  if (GUIDE_RANK_NAMES.has(name)) {
    return `/icons/guide-ranks/${name}.svg`;
  }
  return `/icons/vocab/${name}.svg`;
}

export const VOCAB_ICON_REGISTRY: Record<VocabIconName, VocabIconMeta> = {
  home: { name: "home", label: "Home", category: "nav" },
  skills: { name: "skills", label: "Skills", category: "nav" },
  quest: { name: "quest", label: "Quest", category: "nav" },
  league: { name: "league", label: "League", category: "nav" },
  duels: { name: "duels", label: "Duels", category: "nav" },
  profile: { name: "profile", label: "Profile", category: "nav" },
  settings: { name: "settings", label: "Settings", category: "nav" },
  "momentum-membership": {
    name: "momentum-membership",
    label: "Momentum membership",
    category: "nav",
  },

  "mastery-grid": { name: "mastery-grid", label: "Mastery Grid", category: "core" },
  "skill-tree": { name: "skill-tree", label: "Skill tree", category: "core" },
  "skill-node": { name: "skill-node", label: "Skill node", category: "core" },
  unit: { name: "unit", label: "Unit", category: "core" },
  verified: { name: "verified", label: "Verified", category: "core", allowsGold: true },
  "rank-proof": { name: "rank-proof", label: "Rank proof", category: "core", allowsGold: true },
  "practice-pack": { name: "practice-pack", label: "Practice pack", category: "core" },
  percentile: { name: "percentile", label: "Percentile", category: "core", allowsGold: true },
  xp: { name: "xp", label: "XP", category: "core" },
  streak: { name: "streak", label: "Streak", category: "core" },
  day: { name: "day", label: "Day", category: "core" },
  "day-sun": { name: "day-sun", label: "Sunday", category: "core" },
  "day-mon": { name: "day-mon", label: "Monday", category: "core" },
  "day-tue": { name: "day-tue", label: "Tuesday", category: "core" },
  "day-wed": { name: "day-wed", label: "Wednesday", category: "core" },
  "day-thu": { name: "day-thu", label: "Thursday", category: "core" },
  "day-fri": { name: "day-fri", label: "Friday", category: "core" },
  "day-sat": { name: "day-sat", label: "Saturday", category: "core" },
  "focus-ring": { name: "focus-ring", label: "Focus", category: "core" },
  "status-scheduled": { name: "status-scheduled", label: "Scheduled", category: "core" },
  "status-completed": { name: "status-completed", label: "Completed", category: "core" },
  "status-cancelled": { name: "status-cancelled", label: "Cancelled", category: "core" },
  "status-ended": { name: "status-ended", label: "Ended", category: "core" },
  "status-pending": { name: "status-pending", label: "Pending", category: "core" },
  "status-rejected": { name: "status-rejected", label: "Rejected", category: "core" },

  arena: { name: "arena", label: "Arena", category: "social" },
  division: { name: "division", label: "Division", category: "social" },
  leaderboard: { name: "leaderboard", label: "Leaderboard", category: "social" },
  rival: { name: "rival", label: "Rival", category: "social" },
  "division-war": { name: "division-war", label: "Division war", category: "social" },

  guide: { name: "guide", label: "Guide", category: "coaching" },
  session: { name: "session", label: "Session", category: "coaching" },
  "guide-session": {
    name: "guide-session",
    label: "Guide session",
    category: "coaching",
  },
  breakthrough: { name: "breakthrough", label: "Breakthrough", category: "coaching" },
  momentum: { name: "momentum", label: "Momentum", category: "coaching" },
  "momentum-pack": { name: "momentum-pack", label: "Momentum pack", category: "coaching" },
  "session-credit": { name: "session-credit", label: "Session credit", category: "coaching" },
  booking: { name: "booking", label: "Booking", category: "coaching" },

  receipt: { name: "receipt", label: "Receipt", category: "reports" },
  "movement-receipt": {
    name: "movement-receipt",
    label: "Movement Receipt",
    category: "reports",
  },
  "loop-report": { name: "loop-report", label: "Loop Report", category: "reports" },
  "loop-sla": { name: "loop-sla", label: "Loop SLA", category: "reports" },
  "impact-score": {
    name: "impact-score",
    label: "Guide Impact Score",
    category: "reports",
    allowsGold: true,
  },
  "guide-impact-receipt": {
    name: "guide-impact-receipt",
    label: "Guide impact receipt",
    category: "reports",
    allowsGold: true,
  },
  brief: { name: "brief", label: "Pre-session brief", category: "reports" },
  "study-package": { name: "study-package", label: "Study package", category: "reports" },
  "progress-snapshot": {
    name: "progress-snapshot",
    label: "Progress snapshot",
    category: "reports",
  },
  "progress-archive": {
    name: "progress-archive",
    label: "Progress archive",
    category: "reports",
  },
  "grid-timeline": { name: "grid-timeline", label: "Grid timeline", category: "reports" },
  "trajectory-certificate": {
    name: "trajectory-certificate",
    label: "Trajectory certificate",
    category: "reports",
    allowsGold: true,
  },
  retest: { name: "retest", label: "Retest", category: "reports" },

  identity: { name: "identity", label: "Identity", category: "profile" },
  membership: { name: "membership", label: "Membership", category: "profile" },
  standing: { name: "standing", label: "Standing", category: "profile" },
  share: { name: "share", label: "Share", category: "profile" },
  passport: {
    name: "passport",
    label: "Public rank passport",
    category: "profile",
    allowsGold: true,
  },

  practitioner: { name: "practitioner", label: "Practitioner", category: "guide-rank" },
  specialist: { name: "specialist", label: "Specialist", category: "guide-rank" },
  expert: { name: "expert", label: "Expert", category: "guide-rank" },
  master: { name: "master", label: "Master", category: "guide-rank" },
  elite: { name: "elite", label: "Elite", category: "guide-rank", allowsGold: true },

  "tier-arena": { name: "tier-arena", label: "The Arena", category: "pricing" },
  "tier-breakthrough": {
    name: "tier-breakthrough",
    label: "The Breakthrough",
    category: "pricing",
  },
  "tier-momentum": { name: "tier-momentum", label: "Momentum", category: "pricing" },

  "bento-skill-duels": {
    name: "bento-skill-duels",
    label: "Skill Duels",
    category: "landing",
  },
  "bento-division-leaderboard": {
    name: "bento-division-leaderboard",
    label: "Division Leaderboard",
    category: "landing",
  },
  "bento-quest-practice": {
    name: "bento-quest-practice",
    label: "Quest Practice",
    category: "landing",
  },
  "bento-rank-card": { name: "bento-rank-card", label: "Rank Card", category: "landing" },
  "bento-session-room": {
    name: "bento-session-room",
    label: "Session Room",
    category: "landing",
  },
  "bento-guide-studio": {
    name: "bento-guide-studio",
    label: "Guide Studio",
    category: "landing",
  },
  "bento-breakthrough-events": {
    name: "bento-breakthrough-events",
    label: "Breakthrough Events",
    category: "landing",
  },
  "flow-book": { name: "flow-book", label: "Book", category: "landing" },
  "flow-meet": { name: "flow-meet", label: "Meet", category: "landing" },
  "flow-unpack": { name: "flow-unpack", label: "Unpack", category: "landing" },
  "flow-climb": { name: "flow-climb", label: "Climb", category: "landing" },
};

/** One-word labels for hub tiles and minimal UI copy. */
export const VOCAB_SHORT_LABEL: Partial<Record<VocabIconName, string>> = {
  home: "Home",
  skills: "Skills",
  quest: "Quest",
  league: "League",
  duels: "Duels",
  profile: "Profile",
  settings: "Settings",
  "momentum-membership": "Momentum",
  "mastery-grid": "Grid",
  xp: "XP",
  streak: "Streak",
  session: "Sessions",
  booking: "Book",
  "guide-session": "Guide",
  breakthrough: "Breakthrough",
  momentum: "Momentum",
  brief: "Brief",
  receipt: "Receipt",
  "movement-receipt": "Receipt",
  "loop-report": "Loop",
  "impact-score": "Impact",
  verified: "Verified",
  "rank-proof": "Proof",
  arena: "Arena",
  division: "Division",
  leaderboard: "Leaders",
  passport: "Passport",
};

export const VOCAB_ICON_NAMES = Object.keys(VOCAB_ICON_REGISTRY) as VocabIconName[];

/** Phase 2 atomic vocabulary — everything else composes from these. */
export const CORE_VOCAB_ICON_NAMES = [
  "quest",
  "duels",
  "arena",
  "league",
  "skills",
  "mastery-grid",
  "verified",
  "rank-proof",
  "session",
  "guide-session",
  "breakthrough",
  "momentum",
  "receipt",
  "movement-receipt",
  "loop-report",
  "impact-score",
  "streak",
  "xp",
] as const satisfies readonly VocabIconName[];

export const VOCAB_ICON_CATEGORIES: VocabIconCategory[] = [
  "nav",
  "core",
  "social",
  "coaching",
  "reports",
  "profile",
  "guide-rank",
  "pricing",
  "landing",
];

export function getVocabIconMeta(name: VocabIconName): VocabIconMeta & { src: string } {
  const meta = VOCAB_ICON_REGISTRY[name];
  return { ...meta, src: vocabIconSrc(name) };
}

export function vocabIconsByCategory(
  category: VocabIconCategory,
): Array<VocabIconMeta & { src: string }> {
  return VOCAB_ICON_NAMES.filter((name) => VOCAB_ICON_REGISTRY[name].category === category).map(
    (name) => getVocabIconMeta(name),
  );
}
