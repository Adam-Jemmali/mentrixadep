import { loadSkillTree } from "@/features/skill-tree/load-skill-tree";
import { isNodeUnlocked } from "@/features/skill-tree/skill-tree-unlock-pure";

export const LOCKED_NODE_ERROR = "Locked. Open prior skill.";

export function assertNodeIdsUnlocked(
  targetNodeIds: Iterable<string>,
  parents: ReadonlyMap<string, string[]>,
  solidIds: ReadonlySet<string>,
): void {
  const parentMap = new Map(parents);
  const solidSet = new Set(solidIds);
  for (const nodeId of new Set(targetNodeIds)) {
    if (!parents.has(nodeId) || !isNodeUnlocked(nodeId, parentMap, solidSet)) {
      throw new Error(LOCKED_NODE_ERROR);
    }
  }
}

export async function loadNodeUnlockContext(userId: string): Promise<{
  parents: Map<string, string[]>;
  solidIds: Set<string>;
  unlockedIds: Set<string>;
}> {
  const tree = await loadSkillTree(userId);
  const parents = new Map(
    tree.nodes.map((node) => [node.id, node.prerequisites] as const),
  );
  const solidIds = new Set(
    tree.nodes
      .filter((node) => node.state === "proficient" || node.state === "verified")
      .map((node) => node.id),
  );
  const unlockedIds = new Set(
    tree.nodes
      .filter((node) => isNodeUnlocked(node.id, parents, solidIds))
      .map((node) => node.id),
  );
  return { parents, solidIds, unlockedIds };
}
