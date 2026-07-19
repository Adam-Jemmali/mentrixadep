import type { MasteryNodeState } from "@/features/mastery-grid/types";
import type { FrontierNodeView, FrontierView } from "@/features/skill-tree/types";

const DEFAULT_MAX_CHILDREN = 3;

export function buildFrontier(input: {
  focusId: string;
  parents: Map<string, string[]>;
  children: Map<string, string[]>;
  states: Map<string, MasteryNodeState>;
  unlocked: Set<string>;
  maxChildren?: number;
}): FrontierView {
  const maxChildren = input.maxChildren ?? DEFAULT_MAX_CHILDREN;

  const toNode = (id: string): FrontierNodeView => ({
    id,
    state: input.states.get(id) ?? "none",
    unlocked: input.unlocked.has(id),
  });

  const focus = toNode(input.focusId);
  const parentIds = input.parents.get(input.focusId) ?? [];
  const parents = parentIds.map(toNode);

  const childIds = input.children.get(input.focusId) ?? [];
  const sortedChildIds = [...childIds].sort((left, right) => {
    const leftUnlocked = input.unlocked.has(left) ? 0 : 1;
    const rightUnlocked = input.unlocked.has(right) ? 0 : 1;
    if (leftUnlocked !== rightUnlocked) {
      return leftUnlocked - rightUnlocked;
    }
    return left.localeCompare(right);
  });
  const children = sortedChildIds.slice(0, maxChildren).map(toNode);

  return {
    focusId: input.focusId,
    focus,
    parents,
    children,
  };
}
