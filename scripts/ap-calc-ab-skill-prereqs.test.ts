import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findCycle } from "../src/features/skill-tree/skill-tree-graph-pure";

type SkillNodeSeed = {
  unit_number: number;
  node_slug: string;
  display_order: number;
};

type PrerequisiteSeed = Record<string, string[]>;

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "data");
const nodes = JSON.parse(
  readFileSync(resolve(dataDir, "ap-calc-ab-skill-nodes.json"), "utf8")
) as SkillNodeSeed[];
const configured = JSON.parse(
  readFileSync(resolve(dataDir, "ap-calc-ab-skill-prereqs.json"), "utf8")
) as PrerequisiteSeed;

function resolvedPrerequisites(): PrerequisiteSeed {
  const byUnit = new Map<number, SkillNodeSeed[]>();
  for (const node of nodes) {
    const unitNodes = byUnit.get(node.unit_number) ?? [];
    unitNodes.push(node);
    byUnit.set(node.unit_number, unitNodes);
  }

  const resolved: PrerequisiteSeed = {};
  for (const unitNodes of byUnit.values()) {
    unitNodes.sort((a, b) => a.display_order - b.display_order);
    unitNodes.forEach((node, index) => {
      resolved[node.node_slug] =
        configured[node.node_slug] ?? (index === 0 ? [] : [unitNodes[index - 1]!.node_slug]);
    });
  }
  return resolved;
}

describe("AP Calculus AB prerequisite seed", () => {
  const slugs = new Set(nodes.map((node) => node.node_slug));
  const prerequisites = resolvedPrerequisites();

  it("only references current CED slugs", () => {
    for (const [childSlug, parentSlugs] of Object.entries(configured)) {
      expect(slugs.has(childSlug), `unknown child ${childSlug}`).toBe(true);
      for (const parentSlug of parentSlugs) {
        expect(slugs.has(parentSlug), `unknown parent ${parentSlug}`).toBe(true);
      }
    }
  });

  it("is a superset of every prior within-unit linear edge", () => {
    const byUnit = new Map<number, SkillNodeSeed[]>();
    for (const node of nodes) {
      const unitNodes = byUnit.get(node.unit_number) ?? [];
      unitNodes.push(node);
      byUnit.set(node.unit_number, unitNodes);
    }

    for (const unitNodes of byUnit.values()) {
      unitNodes.sort((a, b) => a.display_order - b.display_order);
      for (let index = 1; index < unitNodes.length; index++) {
        expect(prerequisites[unitNodes[index]!.node_slug]).toContain(
          unitNodes[index - 1]!.node_slug
        );
      }
    }
  });

  it("adds the required cross-cutting prerequisite relationships", () => {
    expect(prerequisites["definition-of-the-derivative-as-a-limit"]).toContain(
      "choosing-a-limit-evaluation-strategy"
    );
    expect(prerequisites["chain-rule-basics"]).toContain("power-rule");
    expect(prerequisites["implicit-differentiation-advanced"]).toContain(
      "chain-rule-with-composite-functions"
    );
    expect(prerequisites["selecting-a-differentiation-technique"]).toContain(
      "chain-rule-with-composite-functions"
    );
    expect(prerequisites["u-substitution-basics"]).toContain("chain-rule-basics");
    expect(prerequisites["net-change-from-rate"]).toContain(
      "fundamental-theorem-of-calculus-part-2"
    );
    expect(prerequisites["area-between-curves-with-vertical-slices"]).toContain(
      "evaluating-definite-integrals"
    );
  });

  it("forms an acyclic graph", () => {
    const graph = nodes.map((node) => ({
      id: node.node_slug,
      prerequisites: prerequisites[node.node_slug] ?? [],
    }));
    expect(findCycle(graph)).toBeNull();
  });
});
