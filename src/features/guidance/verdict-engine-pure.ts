import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import {
  formatPeerStandingShort,
  peerTopPercent,
} from "@/features/xp/rank-statistics-pure";

export type VerdictType =
  | "quest_result"
  | "duel_result"
  | "rank_delta"
  | "impact_score"
  | "breakthrough"
  | "weekly_snapshot";

export type VerdictNextAction = {
  label: string;
  href: string;
};

export type Verdict = {
  changed: string;
  reason: string;
  nextAction: VerdictNextAction;
  /** Peer comparison line; omitted when snapshot sample size is below 10. */
  comparison?: string;
  /** Structured rank movement for icon-first UI. */
  rankDelta?: RankDeltaMeta;
};

export type RankDeltaMeta = {
  accuracy: { current: number; previous: number; delta: number };
  percentile: { current: number; previous: number; delta: number } | null;
  verifiedCount: number;
  drivers: RankDrivingNode[];
  /** No movement on accuracy or percentile since last visit. */
  flat: boolean;
};

export type NodeSessionStat = {
  skillNodeId: string;
  nodeName: string;
  sessionCorrect: number;
  sessionTotal: number;
  misconceptionTag?: string | null;
};

export type NodeRunningAverage = {
  skillNodeId: string;
  nodeName: string;
  accuracyPercent: number;
  attempts: number;
};

export type DuelRoundStat = {
  skillNodeId?: string;
  nodeName?: string;
  misconceptionTag?: string | null;
  correctIndex: number;
  myAnswer: number;
};

export type RankDrivingNode = {
  nodeName: string;
  isCorrect: boolean;
  skillNodeId?: string;
};

export type ImpactNodeStat = {
  skillNodeId: string;
  nodeName: string;
  impactScore: number;
  impactLift: number;
  afterAccuracy: number;
  beforeAccuracy: number;
};

export type SkillNodeGraphRow = {
  id: string;
  nodeName: string;
  displayOrder: number;
  prerequisites: string[];
};

export function roundAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function practiceNodeHref(nodeName: string): string {
  return `/student/quest?prompt=${encodeURIComponent(`Practice ${nodeName}`)}`;
}

export function guideBookingHref(guideId: string, subject = AP_CALC_AB_SUBJECT): string {
  return `/student?subject=${encodeURIComponent(subject)}&guide=${guideId}#browse-guides`;
}

export function retestNodeHref(nodeName: string, skillNodeId?: string): string {
  const base = practiceNodeHref(nodeName);
  if (!skillNodeId) return base;
  return `${base}&retestNode=${encodeURIComponent(skillNodeId)}`;
}

export function browseGuidesHref(subject = AP_CALC_AB_SUBJECT): string {
  return `/student?subject=${encodeURIComponent(subject)}#browse-guides`;
}

function signedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}

export function pickQuestFocusSkillNodeId(
  sessionStats: NodeSessionStat[],
  runningAverages: NodeRunningAverage[],
): string | null {
  if (sessionStats.length === 0) return null;

  const runningById = new Map(runningAverages.map((row) => [row.skillNodeId, row]));
  let worst: { skillNodeId: string; delta: number; sessionAcc: number } | null = null;

  for (const stat of sessionStats) {
    const sessionAcc = roundAccuracyPercent(stat.sessionCorrect, stat.sessionTotal);
    const running = runningById.get(stat.skillNodeId);
    const runningAcc =
      running && running.attempts > 0 ? running.accuracyPercent : sessionAcc;
    const delta = sessionAcc - runningAcc;
    if (
      !worst ||
      delta < worst.delta ||
      (delta === worst.delta && sessionAcc < worst.sessionAcc)
    ) {
      worst = { skillNodeId: stat.skillNodeId, delta, sessionAcc };
    }
  }

  return worst?.skillNodeId ?? null;
}

export function pickImpactFocusSkillNodeId(nodes: ImpactNodeStat[]): string | null {
  if (nodes.length === 0) return null;
  const byAbsLift = [...nodes].sort(
    (a, b) => Math.abs(b.impactLift) - Math.abs(a.impactLift) || b.impactScore - a.impactScore,
  );
  return byAbsLift[0]?.skillNodeId ?? null;
}

export function buildQuestResultVerdict(
  sessionStats: NodeSessionStat[],
  runningAverages: NodeRunningAverage[],
  pendingRetest?: { skillNodeId: string; nodeName: string } | null,
): Verdict {
  const runningById = new Map(runningAverages.map((row) => [row.skillNodeId, row]));

  if (sessionStats.length === 0) {
    return {
      changed: "This pack recorded no skill node attempts.",
      reason: "Questions did not map to tracked AP Calculus AB nodes.",
      nextAction: {
        label: "Start a verified practice pack",
        href: "/student/quest",
      },
    };
  }

  let worst: {
    stat: NodeSessionStat;
    sessionAcc: number;
    runningAcc: number;
    delta: number;
  } | null = null;

  for (const stat of sessionStats) {
    const sessionAcc = roundAccuracyPercent(stat.sessionCorrect, stat.sessionTotal);
    const running = runningById.get(stat.skillNodeId);
    const runningAcc =
      running && running.attempts > 0 ? running.accuracyPercent : sessionAcc;
    const delta = sessionAcc - runningAcc;
    if (
      !worst ||
      delta < worst.delta ||
      (delta === worst.delta && sessionAcc < worst.sessionAcc)
    ) {
      worst = { stat, sessionAcc, runningAcc, delta };
    }
  }

  const focus = worst!.stat;
  const { sessionAcc, runningAcc, delta } = worst!;

  const changed =
    delta === 0
      ? `${focus.nodeName} held at ${sessionAcc}% across ${focus.sessionTotal} question${focus.sessionTotal === 1 ? "" : "s"}, matching your ${runningAcc}% running average.`
      : `${focus.nodeName} moved ${signedDelta(delta)} points this session: ${sessionAcc}% on ${focus.sessionTotal} question${focus.sessionTotal === 1 ? "" : "s"} vs your ${runningAcc}% running average.`;

  const reason = focus.misconceptionTag?.trim()
    ? `The miss pattern tagged "${focus.misconceptionTag.trim()}" on ${focus.nodeName} drove the gap.`
    : delta < 0
      ? `${focus.nodeName} scored below your usual pace on first answers in this pack.`
      : delta > 0
        ? `${focus.nodeName} improved against your running average in this pack.`
        : `${focus.nodeName} matched your established pace on this node.`;

  if (pendingRetest) {
    return {
      changed,
      reason,
      nextAction: {
        label: `Retest ${pendingRetest.nodeName} now`,
        href: retestNodeHref(pendingRetest.nodeName, pendingRetest.skillNodeId),
      },
    };
  }

  return {
    changed,
    reason,
    nextAction: {
      label: `Practice ${focus.nodeName}`,
      href: practiceNodeHref(focus.nodeName),
    },
  };
}

export function buildDuelResultVerdict(
  rounds: DuelRoundStat[],
  scores: {
    yourScore: number;
    theirScore: number;
    total: number;
    youWon: boolean;
    tie: boolean;
  },
): Verdict {
  const { yourScore, theirScore, total, youWon, tie } = scores;
  const outcomeLabel = tie ? "tied" : youWon ? "won" : "lost";

  const changed = `You ${outcomeLabel} the duel at ${yourScore}/${total} vs ${theirScore}/${total}.`;

  const firstMiss = rounds.find(
    (round) =>
      round.myAnswer >= 0 &&
      Number.isInteger(round.correctIndex) &&
      round.myAnswer !== round.correctIndex,
  );

  if (!firstMiss) {
    return {
      changed,
      reason:
        total > 0 && yourScore === total
          ? "Every round was correct; no single node dragged accuracy down."
          : "No graded miss mapped to a skill node in this duel.",
      nextAction: {
        label: "Run another duel",
        href: "/student/duel",
      },
    };
  }

  const nodeLabel = firstMiss.nodeName?.trim() || "the missed skill";
  const reason = firstMiss.misconceptionTag?.trim()
    ? `You missed ${nodeLabel} where the trap tag is "${firstMiss.misconceptionTag.trim()}".`
    : `You missed ${nodeLabel} on the first wrong round regardless of the final score.`;

  const href = firstMiss.nodeName
    ? practiceNodeHref(firstMiss.nodeName)
    : "/student/quest";

  return {
    changed,
    reason,
    nextAction: {
      label: `Practice ${nodeLabel}`,
      href,
    },
  };
}

export function buildRankDeltaVerdict(
  current: {
    accuracyPercent: number;
    percentile: number | null;
    verifiedCount: number;
  },
  previous: {
    accuracyPercent: number;
    percentile: number | null;
  } | null,
  drivingNodes: RankDrivingNode[],
): Verdict {
  const prevAcc = previous?.accuracyPercent ?? current.accuracyPercent;
  const accDelta = current.accuracyPercent - prevAcc;
  const prevPct = previous?.percentile;
  const pctDelta =
    current.percentile != null && prevPct != null
      ? Math.round(current.percentile - prevPct)
      : null;

  const flat = accDelta === 0 && (pctDelta == null || pctDelta === 0);

  const changed =
    flat && current.percentile != null
      ? `${current.accuracyPercent}% first-answer accuracy · ${formatPeerStandingShort(current.percentile)} of Mentrixers.`
      : flat
        ? `${current.accuracyPercent}% first-answer accuracy · ${current.verifiedCount} verified.`
        : pctDelta != null
          ? `Accuracy ${prevAcc}→${current.accuracyPercent}% · Peer standing top ${peerTopPercent(prevPct!)}%→${peerTopPercent(current.percentile!)}.`
          : `Accuracy ${prevAcc}→${current.accuracyPercent}% (${signedDelta(accDelta)}).`;

  const reason =
    !flat && drivingNodes.length > 0
      ? drivingNodes
          .slice(0, 3)
          .map((node) => node.nodeName)
          .join(" · ")
      : "";

  const nextUnverified = drivingNodes.find((node) => !node.isCorrect);
  const nextAction = nextUnverified?.nodeName
    ? {
        label: `Verify ${nextUnverified.nodeName}`,
        href: practiceNodeHref(nextUnverified.nodeName),
      }
    : {
        label: "Verify next node",
        href: "/student/quest",
      };

  return {
    changed,
    reason,
    nextAction,
    rankDelta: {
      accuracy: {
        current: current.accuracyPercent,
        previous: prevAcc,
        delta: accDelta,
      },
      percentile:
        current.percentile != null && prevPct != null
          ? {
              current: Math.round(current.percentile),
              previous: Math.round(prevPct),
              delta: pctDelta ?? 0,
            }
          : current.percentile != null
            ? {
                current: Math.round(current.percentile),
                previous: Math.round(current.percentile),
                delta: 0,
              }
            : null,
      verifiedCount: current.verifiedCount,
      drivers: drivingNodes.slice(0, 3),
      flat,
    },
  };
}

export function buildImpactScoreVerdict(
  nodes: ImpactNodeStat[],
  aggregateScore: number,
  previousAggregateScore?: number | null,
): Verdict {
  if (nodes.length === 0) {
    const prev =
      previousAggregateScore != null ? Math.round(previousAggregateScore) : null;
    const changed =
      prev != null
        ? `Impact Score holds at ${Math.round(aggregateScore)} after the last refresh (was ${prev}).`
        : `Impact Score is ${Math.round(aggregateScore)} with no per-node lift data yet.`;
    return {
      changed,
      reason: "Post-session retests need at least three students per node before node lift is measured.",
      nextAction: {
        label: "Complete more Studio sessions",
        href: "/tutor/sessions-ai",
      },
    };
  }

  const byAbsLift = [...nodes].sort(
    (a, b) => Math.abs(b.impactLift) - Math.abs(a.impactLift) || b.impactScore - a.impactScore,
  );
  const focus = byAbsLift[0]!;

  const prevAgg =
    previousAggregateScore != null ? Math.round(previousAggregateScore) : null;
  const changed =
    prevAgg != null
      ? `Impact Score is ${Math.round(aggregateScore)} (${signedDelta(Math.round(aggregateScore - prevAgg))} vs last refresh); ${focus.nodeName} moved ${signedDelta(Math.round(focus.impactLift))} points on post-session retests.`
      : `Impact Score is ${Math.round(aggregateScore)}; ${focus.nodeName} moved ${signedDelta(Math.round(focus.impactLift))} points on post-session retests (${Math.round(focus.beforeAccuracy)}% to ${Math.round(focus.afterAccuracy)}%).`;

  const reason =
    focus.impactLift >= 0
      ? `${focus.nodeName} improved most after your sessions: ${Math.round(focus.beforeAccuracy)}% before to ${Math.round(focus.afterAccuracy)}% after on first answers.`
      : `${focus.nodeName} declined most after your sessions: ${Math.round(focus.beforeAccuracy)}% before to ${Math.round(focus.afterAccuracy)}% after on first answers.`;

  return {
    changed,
    reason,
    nextAction: {
      label: `Review sessions targeting ${focus.nodeName}`,
      href: "/tutor/sessions-ai",
    },
  };
}

export function findNextReviewNodeAfterBreakthrough(
  nodes: SkillNodeGraphRow[],
  verifiedNodeIds: Set<string>,
  breakthroughConcept: string,
): SkillNodeGraphRow | null {
  const sorted = [...nodes].sort((a, b) => a.displayOrder - b.displayOrder);
  const conceptLower = breakthroughConcept.toLowerCase().trim();

  const breakthroughIdx = sorted.findIndex((node) => {
    const name = node.nodeName.toLowerCase();
    return name.includes(conceptLower) || conceptLower.includes(name);
  });

  const startOrder = breakthroughIdx >= 0 ? sorted[breakthroughIdx]!.displayOrder : -1;

  for (const node of sorted) {
    if (node.displayOrder <= startOrder) continue;
    const prereqsMet =
      node.prerequisites.length === 0 ||
      node.prerequisites.every((id) => verifiedNodeIds.has(id));
    if (prereqsMet && !verifiedNodeIds.has(node.id)) {
      return node;
    }
  }

  for (const node of sorted) {
    const prereqsMet =
      node.prerequisites.length === 0 ||
      node.prerequisites.every((id) => verifiedNodeIds.has(id));
    if (prereqsMet && !verifiedNodeIds.has(node.id)) {
      return node;
    }
  }

  return null;
}

export function buildBreakthroughVerdict(
  concept: string,
  accuracyBefore: number,
  accuracyAfter: number,
  nextNode: SkillNodeGraphRow | null,
): Verdict {
  const jump = Math.round(accuracyAfter - accuracyBefore);
  const changed = `${concept} accuracy jumped from ${Math.round(accuracyBefore)}% to ${Math.round(accuracyAfter)}% (${signedDelta(jump)} points).`;

  const reason = nextNode
    ? `Prerequisites are now satisfied to open ${nextNode.nodeName} next in the skill tree.`
    : `The breakthrough cleared ${concept}; your next verified attempt should extend the chain.`;

  const nextAction = nextNode
    ? {
        label: `Review ${nextNode.nodeName}`,
        href: practiceNodeHref(nextNode.nodeName),
      }
    : {
        label: `Practice ${concept}`,
        href: practiceNodeHref(concept),
      };

  return { changed, reason, nextAction };
}

export function buildWeeklySnapshotVerdict(data: ProgressSnapshotData): Verdict {
  const rankDir = data.rankChange.direction;
  const rankArrow = rankDir === "up" ? "up" : rankDir === "down" ? "down" : "flat";

  const changed = `This week quest accuracy hit ${data.accuracyThisWeek}% (${signedDelta(data.accuracyDelta)} vs last week), rank moved ${rankArrow} from ${data.rankChange.previous.title} to ${data.rankChange.current.title}, and duels were ${data.duelsWon} won / ${data.duelsLost} lost.`;

  const reason = `${data.weakestConcept.label} is still your weakest spot at ${data.weakestConcept.accuracyPercent}% accuracy.`;

  const guide = data.recommendedGuide;
  const label =
    guide.impactScore > 0
      ? `Book ${guide.displayName} (${Math.round(guide.impactScore)} Impact on ${guide.impactSubject})`
      : `Book a Guide for ${data.weakestConcept.label}`;

  return {
    changed,
    reason,
    nextAction: {
      label,
      href: data.bookingCtaUrl,
    },
  };
}
