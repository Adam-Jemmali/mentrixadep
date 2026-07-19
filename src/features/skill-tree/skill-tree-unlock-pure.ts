import type { MasteryNodeState } from "@/features/mastery-grid/types";

export function isSolidState(state: MasteryNodeState): boolean {
  return state === "proficient" || state === "verified";
}

export function isNodeUnlocked(
  nodeId: string,
  parents: Map<string, string[]>,
  solidIds: Set<string>,
): boolean {
  const nodeParents = parents.get(nodeId) ?? [];
  if (nodeParents.length === 0) {
    return true;
  }
  return nodeParents.every((parentId) => solidIds.has(parentId));
}

export function buildSolidIds(
  nodes: { id: string; state: MasteryNodeState }[],
): Set<string> {
  const solidIds = new Set<string>();
  for (const node of nodes) {
    if (isSolidState(node.state)) {
      solidIds.add(node.id);
    }
  }
  return solidIds;
}
