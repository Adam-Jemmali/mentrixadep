import type { PreSessionBrief } from "@/features/pre-session-brief/brief-types";

export type VerifiedGapReceipt = {
  skillNodeId: string;
  nodeName: string;
  accuracy: number;
  lastAttemptAt: string | null;
};

export type GuideStrengthReceipt = {
  skillNodeId: string;
  nodeName: string;
  impactScore: number;
};

export type WarmupItemReceipt = {
  id: string;
  prompt: string;
  explanation: string;
};

export type DeterministicPreSessionBriefReceipt = {
  verifiedGaps: VerifiedGapReceipt[];
  guideStrengths: GuideStrengthReceipt[];
  suggestedStartingNode: string;
  suggestedStartingNodeId: string;
  warmupItems: WarmupItemReceipt[];
};

export function pickSuggestedStartingNode(
  verifiedGaps: VerifiedGapReceipt[],
  guideStrengths: GuideStrengthReceipt[],
): { nodeId: string; nodeName: string } | null {
  if (verifiedGaps.length === 0) return null;

  const weakIds = new Set(verifiedGaps.map((gap) => gap.skillNodeId));
  const overlap = guideStrengths.find((strength) => weakIds.has(strength.skillNodeId));
  if (overlap) {
    return { nodeId: overlap.skillNodeId, nodeName: overlap.nodeName };
  }

  const weakest = verifiedGaps[0]!;
  return { nodeId: weakest.skillNodeId, nodeName: weakest.nodeName };
}

export function buildDeterministicQuestions(
  receipt: DeterministicPreSessionBriefReceipt,
): string[] {
  const focus = receipt.suggestedStartingNode;
  const weakest = receipt.verifiedGaps[0];
  const topGuide = receipt.guideStrengths[0];

  const questions = [
    `Walk me through ${focus} using my verified attempt history, not a generic review.`,
    weakest
      ? `My rolling accuracy on ${weakest.nodeName} is ${Math.round(weakest.accuracy)}%. What should move in this session?`
      : `What verified gap should we close first in this session?`,
    topGuide
      ? `You have ${topGuide.impactScore} impact on ${topGuide.nodeName}. How do we use that on ${focus}?`
      : `Which item-bank warm-up should I master before we advance past ${focus}?`,
  ];

  return questions.slice(0, 3);
}

export function mapReceiptToPreSessionBrief(
  receipt: DeterministicPreSessionBriefReceipt,
): PreSessionBrief {
  const weakSpotsToWatch = receipt.verifiedGaps.map((gap) => {
    const attemptLabel = gap.lastAttemptAt
      ? `, last practice ${new Date(gap.lastAttemptAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : "";
    return `${gap.nodeName}: ${Math.round(gap.accuracy)}% verified rolling accuracy${attemptLabel}`;
  });

  const likelyCoverage = [
    `Verified starting focus: ${receipt.suggestedStartingNode}`,
    ...receipt.guideStrengths.slice(0, 2).map(
      (strength) =>
        `Guide impact on ${strength.nodeName}: ${strength.impactScore} post-session score`,
    ),
  ].slice(0, 3);

  const primaryWarmup = receipt.warmupItems[0];
  const secondaryWarmup = receipt.warmupItems[1];

  return {
    likelyCoverage: likelyCoverage.length > 0 ? likelyCoverage : [`Verified focus: ${receipt.suggestedStartingNode}`],
    weakSpotsToWatch,
    warmUpExercise: {
      title: receipt.suggestedStartingNode,
      prompt: primaryWarmup?.prompt ?? "Review the verified warm-up items in your practice pack before session start.",
      hint: secondaryWarmup?.prompt,
    },
    questionsToAsk: buildDeterministicQuestions(receipt),
  };
}

export function mergeLastAttemptAt(
  gaps: VerifiedGapReceipt[],
  attempts: Array<{ skill_node_id: string | null; last_attempt_at: string | null }>,
): VerifiedGapReceipt[] {
  const latestByNode = new Map<string, string>();
  for (const attempt of attempts) {
    const nodeId = attempt.skill_node_id;
    const at = attempt.last_attempt_at;
    if (!nodeId || !at) continue;
    const prev = latestByNode.get(nodeId);
    if (!prev || new Date(at).getTime() > new Date(prev).getTime()) {
      latestByNode.set(nodeId, at);
    }
  }

  return gaps.map((gap) => ({
    ...gap,
    lastAttemptAt: latestByNode.get(gap.skillNodeId) ?? gap.lastAttemptAt,
  }));
}
