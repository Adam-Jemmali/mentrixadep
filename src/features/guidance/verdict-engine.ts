import { z } from "zod";
import {
  buildBreakthroughVerdict,
  buildDuelResultVerdict,
  buildImpactScoreVerdict,
  buildQuestResultVerdict,
  buildRankDeltaVerdict,
  buildWeeklySnapshotVerdict,
  findNextReviewNodeAfterBreakthrough,
  pickImpactFocusSkillNodeId,
  pickQuestFocusSkillNodeId,
  type RankDrivingNode,
  type Verdict,
} from "@/features/guidance/verdict-engine-pure";
import { loadComparisonContext } from "@/features/comparison/load-comparison-context";
import type { ComparisonActorKind } from "@/features/comparison/comparison-context-pure";
import { applyActiveGoalToVerdict } from "@/features/student-goals/apply-goal-to-verdict";
import { formatPeerStandingShort } from "@/features/xp/rank-statistics-pure";
import { progressSnapshotDataSchema } from "@/features/progress-snapshot/types";
import {
  loadApCalcSkillNodeGraph,
  loadBreakthroughEvent,
  loadDueRetestNode,
  loadGuideAggregateImpactScore,
  loadGuideImpactNodeStats,
  loadLatestProgressSnapshot,
  loadNodeRunningAverages,
  loadRecentRankDrivingNodes,
  loadVerifiedRankCache,
  loadPrerequisiteSatisfiedNodeIds,
  parseDuelRounds,
  parseDuelScores,
  parseQuestSessionStats,
} from "@/features/guidance/verdict-materialized-reads";

export type {
  Verdict,
  VerdictNextAction,
  VerdictType,
  NodeSessionStat,
  DuelRoundStat,
  RankDrivingNode,
  ImpactNodeStat,
} from "@/features/guidance/verdict-engine-pure";

export {
  buildQuestResultVerdict,
  buildDuelResultVerdict,
  buildRankDeltaVerdict,
  buildImpactScoreVerdict,
  buildBreakthroughVerdict,
  buildWeeklySnapshotVerdict,
  practiceNodeHref,
  guideBookingHref,
  retestNodeHref,
  browseGuidesHref,
} from "@/features/guidance/verdict-engine-pure";

const uuidSchema = z.string().uuid();

const verdictTypeSchema = z.enum([
  "quest_result",
  "duel_result",
  "rank_delta",
  "impact_score",
  "breakthrough",
  "weekly_snapshot",
]);

const verdictInputSchema = z.object({
  type: verdictTypeSchema,
  userId: uuidSchema,
  skillNodeId: uuidSchema.optional(),
  scope: z
    .object({
      guideId: uuidSchema.optional(),
      eventId: uuidSchema.optional(),
      duelId: uuidSchema.optional(),
      questId: uuidSchema.optional(),
      periodStartIso: z.string().datetime().optional(),
    })
    .optional(),
  value: z.number().optional(),
  previousValue: z.number().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type VerdictInput = z.infer<typeof verdictInputSchema>;

/**
 * Central guidance service. Every measured surface calls this instead of rendering raw metrics.
 * Deterministic logic only — no AI. Reads materialized tables (single indexed path per type).
 */
export async function getVerdict(input: VerdictInput): Promise<Verdict> {
  const parsed = verdictInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      changed: "Verdict could not be computed from the supplied input.",
      reason: parsed.error.issues[0]?.message ?? "Invalid verdict input.",
      nextAction: {
        label: "Return to practice",
        href: "/student/quest",
      },
    };
  }

  const { type, userId, scope, value, previousValue, context } = parsed.data;

  switch (type) {
    case "quest_result":
      return getQuestResultVerdict(userId, context, skillNodeIdFrom(input));
    case "duel_result":
      return getDuelResultVerdict(userId, context);
    case "rank_delta":
      return getRankDeltaVerdict(
        userId,
        value,
        previousValue,
        scope?.periodStartIso,
        context,
        skillNodeIdFrom(input),
      );
    case "impact_score": {
      const guideId = scope?.guideId;
      if (!guideId) {
        return {
          changed: "Impact Score verdict requires a Guide id in scope.",
          reason: "Pass scope.guideId when requesting an impact_score verdict.",
          nextAction: {
            label: "Open Guide Studio",
            href: "/tutor/sessions-ai",
          },
        };
      }
      return getImpactScoreVerdict(guideId, value, previousValue);
    }
    case "breakthrough":
      return getBreakthroughVerdict(userId, scope?.eventId, context);
    case "weekly_snapshot":
      return getWeeklySnapshotVerdict(userId, context);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function skillNodeIdFrom(input: VerdictInput): string | undefined {
  return input.skillNodeId;
}

async function withComparison(
  verdict: Verdict,
  actorId: string,
  skillNodeId: string | undefined | null,
  actorKind: ComparisonActorKind,
): Promise<Verdict> {
  if (!skillNodeId) return verdict;
  const comparison = await loadComparisonContext(actorId, skillNodeId, actorKind);
  return comparison ? { ...verdict, comparison } : verdict;
}

async function finalizeStudentVerdict(
  userId: string,
  verdict: Verdict,
  skillNodeId?: string | null,
): Promise<Verdict> {
  const withPeer = await withComparison(verdict, userId, skillNodeId, "student");
  return applyActiveGoalToVerdict(userId, withPeer);
}

async function getQuestResultVerdict(
  userId: string,
  context: Record<string, unknown> | undefined,
  focusSkillNodeId?: string,
): Promise<Verdict> {
  let sessionStats = parseQuestSessionStats(context);
  if (focusSkillNodeId && sessionStats.length === 0) {
    sessionStats = [
      {
        skillNodeId: focusSkillNodeId,
        nodeName: typeof context?.nodeName === "string" ? context.nodeName : "This skill",
        sessionCorrect: Number(context?.sessionCorrect ?? 0),
        sessionTotal: Number(context?.sessionTotal ?? 1),
        misconceptionTag:
          typeof context?.misconceptionTag === "string" ? context.misconceptionTag : null,
      },
    ];
  }

  const nodeIds = sessionStats.map((row) => row.skillNodeId);
  const [runningAverages, pendingRetest] = await Promise.all([
    loadNodeRunningAverages(userId, nodeIds),
    loadDueRetestNode(userId),
  ]);

  const verdict = buildQuestResultVerdict(sessionStats, runningAverages, pendingRetest);
  const focusNodeId = pickQuestFocusSkillNodeId(sessionStats, runningAverages);
  return finalizeStudentVerdict(userId, verdict, focusNodeId);
}

async function getDuelResultVerdict(
  userId: string,
  context: Record<string, unknown> | undefined,
): Promise<Verdict> {
  const rounds = parseDuelRounds(context);
  const scores = parseDuelScores(context);
  const verdict = buildDuelResultVerdict(rounds, scores);
  const firstMiss = rounds.find(
    (round) =>
      round.myAnswer >= 0 &&
      Number.isInteger(round.correctIndex) &&
      round.myAnswer !== round.correctIndex,
  );
  return finalizeStudentVerdict(userId, verdict, firstMiss?.skillNodeId);
}

async function getRankDeltaVerdict(
  userId: string,
  value: number | undefined,
  previousValue: number | undefined,
  periodStartIso: string | undefined,
  context: Record<string, unknown> | undefined,
  focusSkillNodeId?: string,
): Promise<Verdict> {
  const [cache, drivingNodes] = await Promise.all([
    loadVerifiedRankCache(userId),
    loadRecentRankDrivingNodes(userId, periodStartIso),
  ]);

  const current = {
    accuracyPercent: value ?? cache.accuracyPercent,
    percentile: cache.percentile,
    verifiedCount: cache.verifiedCount,
  };

  const ctxPrev =
    context && typeof context.previousAccuracyPercent === "number"
      ? {
          accuracyPercent: context.previousAccuracyPercent,
          percentile:
            typeof context.previousPercentile === "number"
              ? context.previousPercentile
              : null,
        }
      : null;

  const previous =
    ctxPrev ??
    (previousValue != null
      ? {
          accuracyPercent: previousValue,
          percentile:
            typeof context?.previousPercentile === "number"
              ? context.previousPercentile
              : null,
        }
      : null);

  const ctxDrivers = Array.isArray(context?.drivingNodes)
    ? (context!.drivingNodes as RankDrivingNode[])
    : null;

  const drivers = ctxDrivers ?? drivingNodes;
  const comparisonNodeId =
    focusSkillNodeId ?? drivers.find((row) => row.skillNodeId)?.skillNodeId;

  return finalizeStudentVerdict(
    userId,
    buildRankDeltaVerdict(current, previous, drivers),
    comparisonNodeId,
  );
}

async function getImpactScoreVerdict(
  guideId: string,
  value: number | undefined,
  previousValue: number | undefined,
): Promise<Verdict> {
  const [nodes, aggregate] = await Promise.all([
    loadGuideImpactNodeStats(guideId),
    loadGuideAggregateImpactScore(guideId),
  ]);

  const score = value ?? aggregate ?? 0;
  const verdict = buildImpactScoreVerdict(nodes, score, previousValue ?? null);
  return withComparison(verdict, guideId, pickImpactFocusSkillNodeId(nodes), "guide");
}

async function getBreakthroughVerdict(
  userId: string,
  eventId: string | undefined,
  context: Record<string, unknown> | undefined,
): Promise<Verdict> {
  const event = await loadBreakthroughEvent(userId, eventId);
  const concept =
    (typeof context?.concept === "string" && context.concept.trim()) ||
    event?.concept ||
    "this concept";
  const accuracyBefore =
    Number(context?.accuracyBefore ?? event?.accuracy_before ?? 0);
  const accuracyAfter =
    Number(context?.accuracyAfter ?? event?.accuracy_after ?? 0);

  const [graph, satisfiedIds] = await Promise.all([
    loadApCalcSkillNodeGraph(),
    loadPrerequisiteSatisfiedNodeIds(userId),
  ]);

  const nextNode = findNextReviewNodeAfterBreakthrough(
    graph,
    satisfiedIds,
    concept,
  );

  const verdict = buildBreakthroughVerdict(concept, accuracyBefore, accuracyAfter, nextNode);
  return finalizeStudentVerdict(userId, verdict, nextNode?.id);
}

async function getWeeklySnapshotVerdict(
  userId: string,
  context: Record<string, unknown> | undefined,
): Promise<Verdict> {
  const comparisonNodeId =
    typeof context?.skillNodeId === "string" ? context.skillNodeId : undefined;

  const snapshotFromContext = context?.snapshot;
  if (snapshotFromContext && typeof snapshotFromContext === "object") {
    const parsedSnapshot = progressSnapshotDataSchema.safeParse(snapshotFromContext);
    if (parsedSnapshot.success) {
      return finalizeStudentVerdict(
        userId,
        buildWeeklySnapshotVerdict(parsedSnapshot.data),
        comparisonNodeId,
      );
    }
  }

  const snapshot = await loadLatestProgressSnapshot(userId);
  if (snapshot) {
    return finalizeStudentVerdict(
      userId,
      buildWeeklySnapshotVerdict(snapshot),
      comparisonNodeId,
    );
  }

  const [rank, dueRetest] = await Promise.all([
    loadVerifiedRankCache(userId),
    loadDueRetestNode(userId),
  ]);

  if (dueRetest) {
    return finalizeStudentVerdict(
      userId,
      {
        changed: `Verified accuracy is ${rank.accuracyPercent}% across ${rank.verifiedCount} skills${rank.percentile != null ? ` · ${formatPeerStandingShort(rank.percentile)} of Mentrixers` : ""}.`,
        reason: "A post-session retest is due before new practice will move your verified rank.",
        nextAction: {
          label: `Retest ${dueRetest.nodeName}`,
          href: `/student/quest?prompt=${encodeURIComponent(`Retest ${dueRetest.nodeName}`)}&retestNode=${encodeURIComponent(dueRetest.skillNodeId)}`,
        },
      },
      dueRetest.skillNodeId,
    );
  }

  return finalizeStudentVerdict(
    userId,
    {
      changed: `Verified accuracy is ${rank.accuracyPercent}% across ${rank.verifiedCount} skill${rank.verifiedCount === 1 ? "" : "s"}${rank.percentile != null ? ` · ${formatPeerStandingShort(rank.percentile)} of Mentrixers` : ""}.`,
      reason: "No weekly snapshot is stored yet; rank reflects your latest verified first attempts.",
      nextAction: {
        label: "Start a verified practice pack",
        href: "/student/quest",
      },
    },
    comparisonNodeId,
  );
}
