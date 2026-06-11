import {
  GUIDE_RANKS,
  type GuideRankDefinition,
  type GuideRankKey,
} from "@/features/guide-rank/constants";

export type GuideRankProgress = {
  current: GuideRankDefinition;
  next: GuideRankDefinition | null;
  sessionsCompleted: number;
  maxImpactScore: number;
  sessionsNeeded: number | null;
  impactNeeded: number | null;
  progressLabel: string;
  progressPercent: number;
};

export function normalizeGuideRankKey(raw: string | null | undefined): GuideRankKey {
  const key = (raw ?? "practitioner").toLowerCase().trim();
  if (GUIDE_RANKS.some((r) => r.key === key)) return key as GuideRankKey;
  return "practitioner";
}

export function resolveGuideRankFromStats(params: {
  sessionsCompleted: number;
  maxImpactScore: number;
  storedRank?: string | null;
}): GuideRankKey {
  const stored = normalizeGuideRankKey(params.storedRank);
  if (stored !== "practitioner" || params.sessionsCompleted >= 5) {
    return stored;
  }
  if (params.sessionsCompleted >= 5) return "practitioner";
  return "practitioner";
}

export function averageImpactScore(
  entries: { impactScore: number; sessionsCounted: number }[],
): number | null {
  const eligible = entries.filter((e) => e.sessionsCounted >= 3);
  if (eligible.length === 0) return null;
  const sum = eligible.reduce((s, e) => s + e.impactScore, 0);
  return Math.round((sum / eligible.length) * 10) / 10;
}

export function maxImpactScore(
  entries: { impactScore: number; sessionsCounted: number }[],
): number {
  const eligible = entries.filter((e) => e.sessionsCounted >= 3);
  if (eligible.length === 0) return 0;
  return Math.max(...eligible.map((e) => e.impactScore));
}

export function getGuideRankProgress(params: {
  rankKey: string;
  sessionsCompleted: number;
  maxImpactScore: number;
}): GuideRankProgress {
  const currentKey = normalizeGuideRankKey(params.rankKey);
  const currentIdx = GUIDE_RANKS.findIndex((r) => r.key === currentKey);
  const current = GUIDE_RANKS[currentIdx >= 0 ? currentIdx : 0]!;
  const next = currentIdx >= 0 && currentIdx < GUIDE_RANKS.length - 1
    ? GUIDE_RANKS[currentIdx + 1]!
    : null;

  if (!next) {
    return {
      current,
      next: null,
      sessionsCompleted: params.sessionsCompleted,
      maxImpactScore: params.maxImpactScore,
      sessionsNeeded: null,
      impactNeeded: null,
      progressLabel: `${current.label} — peak Guide rank`,
      progressPercent: 100,
    };
  }

  const sessionsNeeded = Math.max(0, next.minSessions - params.sessionsCompleted);
  const impactNeeded =
    next.minImpactScore != null
      ? Math.max(0, Math.ceil(next.minImpactScore + 0.01 - params.maxImpactScore))
      : null;

  const sessionProgress =
    next.minSessions > 0
      ? Math.min(100, Math.round((params.sessionsCompleted / next.minSessions) * 100))
      : 100;
  const impactProgress =
    next.minImpactScore != null && next.minImpactScore > 0
      ? Math.min(100, Math.round((params.maxImpactScore / next.minImpactScore) * 100))
      : 100;
  const progressPercent = Math.round((sessionProgress + impactProgress) / 2);

  let progressLabel = `${current.label} → ${next.label}: `;
  const parts: string[] = [];
  if (sessionsNeeded > 0) {
    parts.push(`${sessionsNeeded} more session${sessionsNeeded === 1 ? "" : "s"}`);
  }
  if (impactNeeded != null && impactNeeded > 0) {
    parts.push(`Impact Score >${next.minImpactScore}`);
  }
  if (next.topPercentile) {
    parts.push("top 1% Impact Score");
  }
  progressLabel += parts.length > 0 ? parts.join(" + ") : "requirements met";

  return {
    current,
    next,
    sessionsCompleted: params.sessionsCompleted,
    maxImpactScore: params.maxImpactScore,
    sessionsNeeded: sessionsNeeded > 0 ? sessionsNeeded : null,
    impactNeeded: impactNeeded != null && impactNeeded > 0 ? next.minImpactScore : null,
    progressLabel,
    progressPercent,
  };
}
