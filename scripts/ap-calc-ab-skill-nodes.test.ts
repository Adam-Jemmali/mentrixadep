import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SUBJECT = "AP Calculus AB";
const MIN_NODES = 100;
const MAX_NODES = 150;

const EXPECTED_UNITS: Record<number, string> = {
  1: "Limits and Continuity",
  2: "Differentiation Definition and Properties",
  3: "Differentiation Composite Implicit Inverse",
  4: "Contextual Applications of Differentiation",
  5: "Analytical Applications of Differentiation",
  6: "Integration and Accumulation of Change",
  7: "Differential Equations",
  8: "Applications of Integration",
};

type SkillNodeSeed = {
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  description: string;
  common_misconceptions: string[];
  display_order: number;
};

function loadNodes(): SkillNodeSeed[] {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "data/ap-calc-ab-skill-nodes.json"
  );
  return JSON.parse(readFileSync(path, "utf8")) as SkillNodeSeed[];
}

describe("AP Calculus AB skill tree seed (PROMPT 002)", () => {
  const nodes = loadNodes();

  it("has 100 to 150 nodes", () => {
    expect(nodes.length).toBeGreaterThanOrEqual(MIN_NODES);
    expect(nodes.length).toBeLessThanOrEqual(MAX_NODES);
  });

  it("covers all 8 College Board CED units with correct names", () => {
    for (const [unitStr, unitName] of Object.entries(EXPECTED_UNITS)) {
      const unit = Number(unitStr);
      const unitNodes = nodes.filter((n) => n.unit_number === unit);
      expect(unitNodes.length).toBeGreaterThan(0);
      expect(unitNodes.every((n) => n.unit_name === unitName)).toBe(true);
    }
  });

  it("requires description and one to three misconceptions per node", () => {
    const slugs = new Set<string>();
    for (const node of nodes) {
      expect(node.description.trim().length).toBeGreaterThan(10);
      expect(node.common_misconceptions.length).toBeGreaterThanOrEqual(1);
      expect(node.common_misconceptions.length).toBeLessThanOrEqual(3);
      expect(node.node_slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slugs.has(node.node_slug)).toBe(false);
      slugs.add(node.node_slug);
    }
  });

  it("uses sequential display_order across the full tree", () => {
    const orders = nodes.map((n) => n.display_order).sort((a, b) => a - b);
    expect(orders[0]).toBe(1);
    expect(orders[orders.length - 1]).toBe(nodes.length);
    expect(new Set(orders).size).toBe(nodes.length);
  });
});

export { SUBJECT, MIN_NODES, MAX_NODES, loadNodes };
