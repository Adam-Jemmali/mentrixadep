import { normalizeNodeKey } from "@/features/quest/ap-calc-ab-subject";

export type SkillNodeLookupRow = {
  id: string;
  node_name: string;
  node_slug: string;
};

export function matchSkillNodeForConcept(
  nodes: SkillNodeLookupRow[],
  concept: string,
): SkillNodeLookupRow | null {
  const normalizedConcept = normalizeNodeKey(concept);
  if (!normalizedConcept) return null;

  return (
    nodes.find((node) => {
      const name = normalizeNodeKey(String(node.node_name));
      const slug = normalizeNodeKey(String(node.node_slug));
      return (
        normalizedConcept === name ||
        normalizedConcept === slug ||
        normalizedConcept.includes(name) ||
        name.includes(normalizedConcept)
      );
    }) ?? null
  );
}
