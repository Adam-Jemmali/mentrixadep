// -----------------------------------------------------------------------------
// MENTRIXA RANK SYSTEM
// src/lib/mentrixa-ranks.ts
// -----------------------------------------------------------------------------

export interface MentrixaRank {
  // Internal key - stable, never shown to users.
  key: string;

  // Display name shown in the UI.
  name: string;

  // Roman numeral sub-tier within the rank - null for top rank.
  division: "I" | "II" | "III" | null;

  // Short 2-3 letter badge code.
  badge: string;

  // XP floor to enter this rank.
  xpMin: number;

  // XP ceiling - null means no ceiling (top rank).
  xpMax: number | null;

  // Tailwind classes for styling badges and bars.
  badgeBg: string;
  badgeText: string;
  barColor: string;

  // Short descriptor shown under rank name.
  descriptor: string;

  // Numeric tier index for comparisons.
  tier: number;
}

export const MENTRIXA_RANKS: MentrixaRank[] = [
  {
    key: "novice_iii",
    name: "Novice",
    division: "III",
    badge: "N3",
    xpMin: 0,
    xpMax: 149,
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    barColor: "from-slate-400 to-slate-500",
    descriptor: "First steps into the arena",
    tier: 1,
  },
  {
    key: "novice_ii",
    name: "Novice",
    division: "II",
    badge: "N2",
    xpMin: 150,
    xpMax: 349,
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    barColor: "from-slate-400 to-slate-500",
    descriptor: "Finding your footing",
    tier: 2,
  },
  {
    key: "novice_i",
    name: "Novice",
    division: "I",
    badge: "N1",
    xpMin: 350,
    xpMax: 599,
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    barColor: "from-slate-400 to-slate-500",
    descriptor: "Ready for the next chapter",
    tier: 3,
  },
  {
    key: "scribe_iii",
    name: "Scribe",
    division: "III",
    badge: "SC3",
    xpMin: 600,
    xpMax: 999,
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    barColor: "from-teal-400 to-teal-500",
    descriptor: "Knowledge begins to stick",
    tier: 4,
  },
  {
    key: "scribe_ii",
    name: "Scribe",
    division: "II",
    badge: "SC2",
    xpMin: 1000,
    xpMax: 1499,
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    barColor: "from-teal-400 to-teal-500",
    descriptor: "Patterns are forming",
    tier: 5,
  },
  {
    key: "scribe_i",
    name: "Scribe",
    division: "I",
    badge: "SC1",
    xpMin: 1500,
    xpMax: 2199,
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-800",
    barColor: "from-teal-400 to-teal-600",
    descriptor: "The record grows",
    tier: 6,
  },
  {
    key: "acolyte_iii",
    name: "Acolyte",
    division: "III",
    badge: "AC3",
    xpMin: 2200,
    xpMax: 3199,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    barColor: "from-blue-500 to-blue-600",
    descriptor: "Devoted to the craft",
    tier: 7,
  },
  {
    key: "acolyte_ii",
    name: "Acolyte",
    division: "II",
    badge: "AC2",
    xpMin: 3200,
    xpMax: 4499,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    barColor: "from-blue-500 to-blue-600",
    descriptor: "Duels sharpen the mind",
    tier: 8,
  },
  {
    key: "acolyte_i",
    name: "Acolyte",
    division: "I",
    badge: "AC1",
    xpMin: 4500,
    xpMax: 6299,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    barColor: "from-blue-500 to-blue-700",
    descriptor: "Approaching the inner circle",
    tier: 9,
  },
  {
    key: "adept_iii",
    name: "Adept",
    division: "III",
    badge: "AD3",
    xpMin: 6300,
    xpMax: 8999,
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    barColor: "from-indigo-500 to-indigo-600",
    descriptor: "Theory becomes instinct",
    tier: 10,
  },
  {
    key: "adept_ii",
    name: "Adept",
    division: "II",
    badge: "AD2",
    xpMin: 9000,
    xpMax: 12499,
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-700",
    barColor: "from-indigo-500 to-indigo-600",
    descriptor: "Few reach this depth",
    tier: 11,
  },
  {
    key: "adept_i",
    name: "Adept",
    division: "I",
    badge: "AD1",
    xpMin: 12500,
    xpMax: 17499,
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    barColor: "from-indigo-500 to-indigo-700",
    descriptor: "Mastery is within reach",
    tier: 12,
  },
  {
    key: "luminary_iii",
    name: "Luminary",
    division: "III",
    badge: "LM3",
    xpMin: 17500,
    xpMax: 23999,
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    barColor: "from-violet-500 to-violet-600",
    descriptor: "Light in the division",
    tier: 13,
  },
  {
    key: "luminary_ii",
    name: "Luminary",
    division: "II",
    badge: "LM2",
    xpMin: 24000,
    xpMax: 31999,
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    barColor: "from-violet-500 to-violet-600",
    descriptor: "Others follow your path",
    tier: 14,
  },
  {
    key: "luminary_i",
    name: "Luminary",
    division: "I",
    badge: "LM1",
    xpMin: 32000,
    xpMax: 41999,
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-800",
    barColor: "from-violet-500 to-violet-700",
    descriptor: "Division elite",
    tier: 15,
  },
  {
    key: "virtuoso_iii",
    name: "Virtuoso",
    division: "III",
    badge: "VT3",
    xpMin: 42000,
    xpMax: 54999,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    barColor: "from-purple-500 to-purple-600",
    descriptor: "Fluency beyond effort",
    tier: 16,
  },
  {
    key: "virtuoso_ii",
    name: "Virtuoso",
    division: "II",
    badge: "VT2",
    xpMin: 55000,
    xpMax: 71999,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700",
    barColor: "from-purple-500 to-purple-600",
    descriptor: "Concepts bend to your will",
    tier: 17,
  },
  {
    key: "virtuoso_i",
    name: "Virtuoso",
    division: "I",
    badge: "VT1",
    xpMin: 72000,
    xpMax: 91999,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    barColor: "from-purple-500 to-purple-700",
    descriptor: "The platform takes notice",
    tier: 18,
  },
  {
    key: "sentinel_iii",
    name: "Sentinel",
    division: "III",
    badge: "SN3",
    xpMin: 92000,
    xpMax: 119999,
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    barColor: "from-rose-500 to-rose-600",
    descriptor: "Guardian of the division",
    tier: 19,
  },
  {
    key: "sentinel_ii",
    name: "Sentinel",
    division: "II",
    badge: "SN2",
    xpMin: 120000,
    xpMax: 154999,
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    barColor: "from-rose-500 to-rose-600",
    descriptor: "Opponents prepare before dueling you",
    tier: 20,
  },
  {
    key: "sentinel_i",
    name: "Sentinel",
    division: "I",
    badge: "SN1",
    xpMin: 155000,
    xpMax: 199999,
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    barColor: "from-rose-500 to-rose-700",
    descriptor: "The wall others cannot breach",
    tier: 21,
  },
  {
    key: "archon_iii",
    name: "Archon",
    division: "III",
    badge: "AR3",
    xpMin: 200000,
    xpMax: 259999,
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    barColor: "from-orange-500 to-orange-600",
    descriptor: "Command of every domain",
    tier: 22,
  },
  {
    key: "archon_ii",
    name: "Archon",
    division: "II",
    badge: "AR2",
    xpMin: 260000,
    xpMax: 329999,
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    barColor: "from-orange-500 to-orange-600",
    descriptor: "Top 5% of the platform",
    tier: 23,
  },
  {
    key: "archon_i",
    name: "Archon",
    division: "I",
    badge: "AR1",
    xpMin: 330000,
    xpMax: 419999,
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-800",
    barColor: "from-orange-500 to-orange-700",
    descriptor: "The few who rule the leaderboard",
    tier: 24,
  },
  {
    key: "polymath_iii",
    name: "Polymath",
    division: "III",
    badge: "PM3",
    xpMin: 420000,
    xpMax: 529999,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    barColor: "from-amber-500 to-amber-600",
    descriptor: "Every subject yields to you",
    tier: 25,
  },
  {
    key: "polymath_ii",
    name: "Polymath",
    division: "II",
    badge: "PM2",
    xpMin: 530000,
    xpMax: 659999,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    barColor: "from-amber-500 to-amber-600",
    descriptor: "Depth across every field",
    tier: 26,
  },
  {
    key: "polymath_i",
    name: "Polymath",
    division: "I",
    badge: "PM1",
    xpMin: 660000,
    xpMax: 819999,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    barColor: "from-amber-500 to-amber-700",
    descriptor: "A name the platform remembers",
    tier: 27,
  },
  {
    key: "oracle_iii",
    name: "Oracle",
    division: "III",
    badge: "OR3",
    xpMin: 820000,
    xpMax: 999999,
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-700",
    barColor: "from-cyan-500 to-cyan-600",
    descriptor: "The answer before the question",
    tier: 28,
  },
  {
    key: "oracle_ii",
    name: "Oracle",
    division: "II",
    badge: "OR2",
    xpMin: 1000000,
    xpMax: 1249999,
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-700",
    barColor: "from-cyan-500 to-cyan-600",
    descriptor: "Top 1% of all Mentrixers",
    tier: 29,
  },
  {
    key: "oracle_i",
    name: "Oracle",
    division: "I",
    badge: "OR1",
    xpMin: 1250000,
    xpMax: 1599999,
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800",
    barColor: "from-cyan-500 to-cyan-700",
    descriptor: "Seen by every division",
    tier: 30,
  },
  {
    key: "apex",
    name: "Apex",
    division: null,
    badge: "APX",
    xpMin: 1600000,
    xpMax: null,
    badgeBg: "bg-gradient-to-br from-slate-900 to-slate-700",
    badgeText: "text-white",
    barColor: "from-slate-700 to-slate-900",
    descriptor: "There is no rank above this. You became the standard.",
    tier: 31,
  },
];

export function getRankFromXp(xp: number): MentrixaRank {
  for (let i = MENTRIXA_RANKS.length - 1; i >= 0; i--) {
    if (xp >= MENTRIXA_RANKS[i].xpMin) {
      return MENTRIXA_RANKS[i];
    }
  }
  return MENTRIXA_RANKS[0];
}

export function getProgressToNextRank(xp: number): {
  currentRank: MentrixaRank;
  nextRank: MentrixaRank | null;
  xpToNext: number;
  xpIntoCurrentRank: number;
  xpSpanOfCurrentRank: number;
  progressPercent: number;
} {
  const currentRank = getRankFromXp(xp);
  const currentIndex = MENTRIXA_RANKS.findIndex((r) => r.key === currentRank.key);
  const nextRank =
    currentIndex < MENTRIXA_RANKS.length - 1 ? MENTRIXA_RANKS[currentIndex + 1] : null;

  if (!nextRank || currentRank.xpMax === null) {
    return {
      currentRank,
      nextRank: null,
      xpToNext: 0,
      xpIntoCurrentRank: xp - currentRank.xpMin,
      xpSpanOfCurrentRank: xp - currentRank.xpMin || 1,
      progressPercent: 100,
    };
  }

  const xpIntoCurrentRank = xp - currentRank.xpMin;
  const xpSpanOfCurrentRank = currentRank.xpMax - currentRank.xpMin + 1;
  const xpToNext = nextRank.xpMin - xp;
  const progressPercent = Math.min(
    Math.round((xpIntoCurrentRank / xpSpanOfCurrentRank) * 100),
    99,
  );

  return {
    currentRank,
    nextRank,
    xpToNext,
    xpIntoCurrentRank,
    xpSpanOfCurrentRank,
    progressPercent,
  };
}

export function useLevelInfo(totalXp: number) {
  const {
    currentRank,
    nextRank,
    xpToNext,
    xpIntoCurrentRank,
    xpSpanOfCurrentRank,
    progressPercent,
  } = getProgressToNextRank(totalXp);

  const currentLevel = currentRank.division
    ? `${currentRank.name} ${currentRank.division}`
    : currentRank.name;

  const nextLevel = nextRank
    ? nextRank.division
      ? `${nextRank.name} ${nextRank.division}`
      : nextRank.name
    : "Apex";

  return {
    currentLevel,
    nextLevel,
    xpToNext,
    maxXpForBar: currentRank.xpMin + xpSpanOfCurrentRank,
    currentRank,
    nextRank,
    progressPercent,
    barColorClass: currentRank.barColor,
    badgeBgClass: currentRank.badgeBg,
    badgeTextClass: currentRank.badgeText,
    xpIntoCurrentRank,
  };
}

export function formatRankForBadge(rank: MentrixaRank): { line1: string; line2: string } {
  return {
    line1: rank.name,
    line2: rank.division ? `Division ${rank.division}` : "Unique Rank",
  };
}

export function isSameRankGroup(xpA: number, xpB: number): boolean {
  return getRankFromXp(xpA).name === getRankFromXp(xpB).name;
}

export function getOverallRankProgress(xp: number): {
  ranksCleared: number;
  totalRanks: number;
  percentComplete: number;
} {
  const current = getRankFromXp(xp);
  return {
    ranksCleared: current.tier - 1,
    totalRanks: MENTRIXA_RANKS.length,
    percentComplete: Math.round(((current.tier - 1) / MENTRIXA_RANKS.length) * 100),
  };
}
