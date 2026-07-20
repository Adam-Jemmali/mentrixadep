import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { pickPrimaryWeakestMasteryNode } from "@/features/mastery-grid/mastery-grid-pure";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  pickTopSecondaryDeficit,
  resolveCauseFocusNodeId,
} from "@/features/skill-tree/skill-error-aggregate-pure";
import { loadRecentSkillErrorEvents } from "@/features/skill-tree/record-skill-error";
import { loadMistakeTreasuryItemIds } from "@/features/skill-tree/load-mistake-treasury";
import { buildFrontier } from "@/features/skill-tree/skill-tree-frontier-pure";
import { buildAdjacency } from "@/features/skill-tree/skill-tree-graph-pure";
import { isSkillTreeReviewDue } from "@/features/skill-tree/skill-tree-review-pure";
import {
  buildSolidIds,
  isNodeUnlocked,
} from "@/features/skill-tree/skill-tree-unlock-pure";
import type {
  SkillTreeData,
  SkillTreeFocusCause,
  SkillTreeNode,
} from "@/features/skill-tree/types";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

type SkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  display_order: number;
  prerequisites: string[] | null;
};

type KnowledgeReviewRow = {
  skill_node_id: string | null;
  next_review_at: string | null;
};

function pickDefaultFocusNodeId(
  grid: MasteryGridData,
  nodes: SkillTreeNode[],
  now: Date,
): string {
  const displayOrderedNodes = [...nodes].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  const reviewDue = displayOrderedNodes.find(
    (node) =>
      node.unlocked &&
      isSkillTreeReviewDue({
        nextReviewAt: node.nextReviewAt,
        now,
        state: node.state,
      }),
  );
  if (reviewDue) {
    return reviewDue.id;
  }

  const unlockedIds = new Set(
    nodes.filter((node) => node.unlocked).map((node) => node.id),
  );
  const unlockedGrid: MasteryGridData = {
    ...grid,
    units: grid.units
      .map((unit) => ({
        ...unit,
        nodes: unit.nodes.filter((node) => unlockedIds.has(node.id)),
      }))
      .filter((unit) => unit.nodes.length > 0),
  };
  const weakest = pickPrimaryWeakestMasteryNode(unlockedGrid);
  if (weakest) {
    return weakest.id;
  }

  const nextOpen = displayOrderedNodes.find(
    (node) =>
      node.unlocked && (node.state === "none" || node.state === "weak"),
  );
  if (nextOpen) {
    return nextOpen.id;
  }

  const unitOneRoot = displayOrderedNodes.find(
    (node) => node.unitNumber === 1 && node.prerequisites.length === 0,
  );
  return unitOneRoot?.id ?? displayOrderedNodes[0]?.id ?? "";
}

export function buildSkillTreeData(
  grid: MasteryGridData,
  skillNodes: SkillNodeRow[],
  knowledgeRows: KnowledgeReviewRow[],
  focusOverride: SkillTreeFocusCause | null = null,
  now: Date = new Date(),
  mistakeItemCount = 0,
): SkillTreeData {
  const skillById = new Map(skillNodes.map((node) => [node.id, node]));
  const reviewById = new Map(
    knowledgeRows
      .filter(
        (row): row is KnowledgeReviewRow & { skill_node_id: string } =>
          row.skill_node_id != null,
      )
      .map((row) => [row.skill_node_id, row.next_review_at]),
  );
  const gridNodes = grid.units.flatMap((unit) =>
    unit.nodes.map((node) => ({ ...node, unit })),
  );
  const graphInputs = gridNodes.map(({ id }) => ({
    id,
    prerequisites: skillById.get(id)?.prerequisites ?? [],
  }));
  const { parents, children } = buildAdjacency(graphInputs);
  const solidIds = buildSolidIds(gridNodes);

  const nodes: SkillTreeNode[] = gridNodes.map(({ unit, ...node }) => ({
    id: node.id,
    nodeName: node.nodeName,
    nodeSlug: node.nodeSlug,
    unitNumber: unit.unitNumber,
    unitName: unit.unitName,
    displayOrder: node.displayOrder,
    state: node.state,
    prerequisites: parents.get(node.id) ?? [],
    unlocked: isNodeUnlocked(node.id, parents, solidIds),
    nextReviewAt: reviewById.get(node.id) ?? null,
  }));

  const unlocked = new Set(
    nodes.filter((node) => node.unlocked).map((node) => node.id),
  );

  let focusCause: SkillTreeFocusCause | null = null;
  let focusNodeId = pickDefaultFocusNodeId(grid, nodes, now);

  if (focusOverride && unlocked.has(focusOverride.nodeId)) {
    focusCause = focusOverride;
    focusNodeId = focusOverride.nodeId;
  }

  const states = new Map(nodes.map((node) => [node.id, node.state]));

  return {
    subject: grid.subject,
    grid,
    nodes,
    frontier: buildFrontier({
      focusId: focusNodeId,
      parents,
      children,
      states,
      unlocked,
    }),
    focusNodeId,
    focusCause,
    mistakeItemCount,
  };
}

export async function loadSkillTree(userId: string): Promise<SkillTreeData> {
  const admin = createAdminClient();
  const [grid, nodesResult, knowledgeResult, errorEvents, mistakeItemIds] = await Promise.all([
    loadMasteryGrid(userId),
    admin
      .from("skill_nodes")
      .select(
        "id, unit_number, unit_name, node_name, node_slug, display_order, prerequisites",
      )
      .eq("subject", AP_CALC_AB_SUBJECT)
      .order("display_order"),
    admin
      .from("student_knowledge_nodes")
      .select("skill_node_id, next_review_at")
      .eq("user_id", userId)
      .eq("subject", AP_CALC_AB_SUBJECT),
    loadRecentSkillErrorEvents(userId).catch(() => []),
    loadMistakeTreasuryItemIds(userId).catch(() => []),
  ]);

  if (nodesResult.error) throw new Error(nodesResult.error.message);
  if (knowledgeResult.error) throw new Error(knowledgeResult.error.message);

  const skillNodes = (nodesResult.data ?? []) as SkillNodeRow[];
  const knownIds = new Set(skillNodes.map((node) => node.id));
  for (const node of skillNodes) {
    for (const prerequisiteId of node.prerequisites ?? []) {
      if (!knownIds.has(prerequisiteId)) {
        console.warn(
          `Skill tree node ${node.id} has missing prerequisite ${prerequisiteId}.`,
        );
      }
    }
  }

  const base = buildSkillTreeData(
    grid,
    skillNodes,
    (knowledgeResult.data ?? []) as KnowledgeReviewRow[],
    null,
    new Date(),
    mistakeItemIds.length,
  );

  const topDeficit = pickTopSecondaryDeficit(errorEvents);
  if (!topDeficit) return base;

  const slugToNodeId = new Map(
    skillNodes.map((node) => [node.node_slug.toLowerCase(), node.id]),
  );
  const { parents } = buildAdjacency(
    skillNodes.map((node) => ({
      id: node.id,
      prerequisites: node.prerequisites ?? [],
    })),
  );
  const unlockedIds = new Set(
    base.nodes.filter((node) => node.unlocked).map((node) => node.id),
  );
  const causeNodeId = resolveCauseFocusNodeId({
    tag: topDeficit.tag,
    slugToNodeId,
    parents,
    unlockedIds,
  });
  if (!causeNodeId) return base;

  return buildSkillTreeData(
    grid,
    skillNodes,
    (knowledgeResult.data ?? []) as KnowledgeReviewRow[],
    { tag: topDeficit.tag, nodeId: causeNodeId },
    new Date(),
    mistakeItemIds.length,
  );
}
