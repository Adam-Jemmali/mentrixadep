import { normalizeNodeKey } from "@/features/quest/ap-calc-ab-subject";
import type { SkillNodeTopicRef } from "@/features/breakthrough-events/schedule-session-retests-pure";
import { topicMatchesSkillNode } from "@/features/breakthrough-events/schedule-session-retests-pure";
import {
  collectStudioPackageTopicCandidates,
  type StudioPackageTopicSource,
} from "@/features/studio-ai/studio-personalization-pure";

/**
 * Nodes this Studio package actually covers from call-derived text.
 * Does not use pre-session weakest-node seeds.
 */
export function resolveStudioCallCoveredNodeIds(
  packageSource: StudioPackageTopicSource,
  skillNodes: SkillNodeTopicRef[],
  limit = 6,
): string[] {
  const candidates = collectStudioPackageTopicCandidates(packageSource);
  const covered: string[] = [];
  const seen = new Set<string>();

  for (const topic of candidates) {
    for (const node of skillNodes) {
      if (seen.has(node.id)) continue;
      if (!topicMatchesSkillNode(topic, node) && !looseTopicContainsNode(topic, node)) {
        continue;
      }
      seen.add(node.id);
      covered.push(node.id);
      if (covered.length >= limit) return covered;
    }
  }

  return covered;
}

function looseTopicContainsNode(topic: string, node: SkillNodeTopicRef): boolean {
  const topicKey = normalizeNodeKey(topic);
  const nameKey = normalizeNodeKey(node.node_name);
  if (!topicKey || !nameKey || nameKey.length < 4) return false;
  return topicKey.includes(nameKey);
}

export type StudioMasteryPanelMode = "call_nodes" | "full_grid" | "unavailable";

export function resolveStudioMasteryPanelMode(input: {
  isApCalc: boolean;
  coveredNodeIds: string[];
  hasMasteryGrid: boolean;
}): StudioMasteryPanelMode {
  if (!input.isApCalc || !input.hasMasteryGrid) return "unavailable";
  if (input.coveredNodeIds.length > 0) return "call_nodes";
  return "full_grid";
}
