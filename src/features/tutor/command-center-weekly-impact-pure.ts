import {
  buildImpactScoreVerdict,
  type ImpactNodeStat,
  type Verdict,
} from "@/features/guidance/verdict-engine-pure";

export type WeeklyTaughtNode = {
  skillNodeId: string;
  nodeName: string;
};

export type GuideWeeklyNodeImpact = {
  skillNodeId: string;
  nodeName: string;
  verdict: Verdict;
};

export function buildWeeklyTaughtNodeVerdict(
  nodeName: string,
  stat: ImpactNodeStat | null,
): Verdict {
  if (!stat) {
    return {
      changed: `You taught ${nodeName} this week.`,
      reason: "Post-session retest has not landed yet, so first-answer lift is not measured.",
      nextAction: {
        label: "Review Studio sessions",
        href: "/tutor/sessions-ai",
      },
    };
  }

  if (stat.impactLift > 0) {
    return buildImpactScoreVerdict([stat], stat.impactScore, null);
  }

  if (stat.impactLift < 0) {
    return {
      changed: `${nodeName} slipped ${Math.abs(Math.round(stat.impactLift))} points on post-session first answers (${Math.round(stat.beforeAccuracy)}% to ${Math.round(stat.afterAccuracy)}%).`,
      reason: "Students missed the same misconception after session close. Target that node in your next Studio review.",
      nextAction: {
        label: `Review sessions on ${nodeName}`,
        href: "/tutor/sessions-ai",
      },
    };
  }

  return {
    changed: `${nodeName} held flat on post-session first answers (${Math.round(stat.afterAccuracy)}%).`,
    reason: "No verified lift yet this week. Tighten the closing re-test loop on this node.",
    nextAction: {
      label: `Review sessions on ${nodeName}`,
      href: "/tutor/sessions-ai",
    },
  };
}

export function mapWeeklyNodeImpacts(
  taughtNodes: WeeklyTaughtNode[],
  statsByNodeId: Map<string, ImpactNodeStat>,
): GuideWeeklyNodeImpact[] {
  return taughtNodes.map((node) => ({
    skillNodeId: node.skillNodeId,
    nodeName: node.nodeName,
    verdict: buildWeeklyTaughtNodeVerdict(node.nodeName, statsByNodeId.get(node.skillNodeId) ?? null),
  }));
}
