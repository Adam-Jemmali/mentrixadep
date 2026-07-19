import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { pickPrimaryWeakestMasteryNode } from "@/features/mastery-grid/mastery-grid-pure";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { buildFrontier } from "@/features/skill-tree/skill-tree-frontier-pure";
import { buildAdjacency } from "@/features/skill-tree/skill-tree-graph-pure";
import {
  buildSolidIds,
  isNodeUnlocked,
} from "@/features/skill-tree/skill-tree-unlock-pure";
import type {
  SkillTreeData,
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

function pickFocusNodeId(
  grid: MasteryGridData,
  nodes: SkillTreeNode[],
): string {
  const displayOrderedNodes = [...nodes].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
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

  const nodes = gridNodes.map(({ unit, ...node }) => ({
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
  const focusNodeId = pickFocusNodeId(grid, nodes);
  const states = new Map(nodes.map((node) => [node.id, node.state]));
  const unlocked = new Set(
    nodes.filter((node) => node.unlocked).map((node) => node.id),
  );

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
  };
}

export async function loadSkillTree(userId: string): Promise<SkillTreeData> {
  const admin = createAdminClient();
  const [grid, nodesResult, knowledgeResult] = await Promise.all([
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

  return buildSkillTreeData(
    grid,
    skillNodes,
    (knowledgeResult.data ?? []) as KnowledgeReviewRow[],
  );
}
