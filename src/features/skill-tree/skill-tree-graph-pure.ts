import type { SkillTreeNodeInput } from "@/features/skill-tree/types";

export function buildAdjacency(nodes: SkillTreeNodeInput[]): {
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
} {
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();

  for (const node of nodes) {
    parents.set(node.id, [...node.prerequisites]);
    if (!children.has(node.id)) {
      children.set(node.id, []);
    }
    for (const parentId of node.prerequisites) {
      const childList = children.get(parentId) ?? [];
      childList.push(node.id);
      children.set(parentId, childList);
    }
  }

  return { parents, children };
}

export function findCycle(nodes: SkillTreeNodeInput[]): string[] | null {
  const { children } = buildAdjacency(nodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(nodeId: string, path: string[]): string[] | null {
    if (visiting.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return cycleStart >= 0 ? [...path.slice(cycleStart), nodeId] : [nodeId];
    }
    if (visited.has(nodeId)) {
      return null;
    }

    visiting.add(nodeId);
    path.push(nodeId);

    for (const childId of children.get(nodeId) ?? []) {
      if (!nodeIds.has(childId)) {
        continue;
      }
      const cycle = dfs(childId, path);
      if (cycle) {
        return cycle;
      }
    }

    path.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  }

  for (const nodeId of nodeIds) {
    const cycle = dfs(nodeId, []);
    if (cycle) {
      return cycle;
    }
  }

  return null;
}
