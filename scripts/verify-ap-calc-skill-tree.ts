#!/usr/bin/env npx tsx
/**
 * Verify AP Calculus AB skill tree seed file and optional live DB count.
 *
 * Usage:
 *   npx tsx scripts/verify-ap-calc-skill-tree.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findCycle } from "../src/features/skill-tree/skill-tree-graph-pure";

const SUBJECT = "AP Calculus AB";
const MIN_NODES = 100;
const MAX_NODES = 150;

type SkillNodeSeed = {
  unit_number: number;
  node_slug: string;
  display_order: number;
};
type PrerequisiteSeed = Record<string, string[]>;

function loadEnv(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

function loadNodes(): SkillNodeSeed[] {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "data/ap-calc-ab-skill-nodes.json"
  );
  return JSON.parse(readFileSync(path, "utf8")) as SkillNodeSeed[];
}

function loadConfiguredPrerequisites(): PrerequisiteSeed {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "data/ap-calc-ab-skill-prereqs.json"
  );
  return JSON.parse(readFileSync(path, "utf8")) as PrerequisiteSeed;
}

function validatePrerequisites(nodes: SkillNodeSeed[]): void {
  const configured = loadConfiguredPrerequisites();
  const slugs = new Set(nodes.map((node) => node.node_slug));
  for (const [childSlug, parentSlugs] of Object.entries(configured)) {
    if (!slugs.has(childSlug)) {
      throw new Error(`FAIL: unknown prerequisite child slug: ${childSlug}`);
    }
    for (const parentSlug of parentSlugs) {
      if (!slugs.has(parentSlug)) {
        throw new Error(`FAIL: unknown prerequisite parent slug: ${parentSlug}`);
      }
    }
  }

  const byUnit = new Map<number, SkillNodeSeed[]>();
  for (const node of nodes) {
    const unitNodes = byUnit.get(node.unit_number) ?? [];
    unitNodes.push(node);
    byUnit.set(node.unit_number, unitNodes);
  }

  const graph: { id: string; prerequisites: string[] }[] = [];
  for (const unitNodes of byUnit.values()) {
    unitNodes.sort((a, b) => a.display_order - b.display_order);
    unitNodes.forEach((node, index) => {
      graph.push({
        id: node.node_slug,
        prerequisites:
          configured[node.node_slug] ??
          (index === 0 ? [] : [unitNodes[index - 1]!.node_slug]),
      });
    });
  }

  const cycle = findCycle(graph);
  if (cycle) {
    throw new Error(`FAIL: prerequisite cycle detected: ${cycle.join(" -> ")}`);
  }
  console.log(
    `Prerequisites: ${Object.keys(configured).length} configured nodes; all slugs resolve; DAG acyclic.`
  );
}

async function main(): Promise<void> {
  loadEnv();

  const nodes = loadNodes();
  console.log(`Seed file: ${nodes.length} nodes for "${SUBJECT}" (${MIN_NODES}–${MAX_NODES} expected).`);

  if (nodes.length < MIN_NODES || nodes.length > MAX_NODES) {
    console.error("FAIL: node count out of range.");
    process.exit(1);
  }
  validatePrerequisites(nodes);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.log("SKIP: no Supabase env; seed file validation only.");
    console.log("OK: seed file passes PROMPT 002 checks.");
    process.exit(0);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: dbRows, error } = await supabase
    .from("skill_nodes")
    .select("id, node_slug, prerequisites")
    .eq("subject", SUBJECT);

  if (error) {
    console.error("DB count failed:", error.message);
    console.log("Run migration 104 and 114, then: npm run skill-tree:seed");
    process.exit(1);
  }

  const dbCount = dbRows?.length ?? 0;
  console.log(`Database: ${dbCount} rows for "${SUBJECT}".`);

  if (dbCount < MIN_NODES || dbCount > MAX_NODES) {
    console.error("FAIL: database count out of range. Run: npm run skill-tree:seed");
    process.exit(1);
  }

  const dbSlugs = new Set((dbRows ?? []).map((row) => row.node_slug));
  const missingSlugs = nodes
    .map((node) => node.node_slug)
    .filter((slug) => !dbSlugs.has(slug));
  if (missingSlugs.length > 0) {
    console.error(`FAIL: database is missing ${missingSlugs.length} current seed slugs.`);
    console.error(missingSlugs.join(", "));
    process.exit(1);
  }

  const dbIds = new Set((dbRows ?? []).map((row) => row.id));
  const unresolvedIds = new Set(
    (dbRows ?? [])
      .flatMap((row) => row.prerequisites ?? [])
      .filter((id) => !dbIds.has(id))
  );
  if (unresolvedIds.size > 0) {
    console.error(`FAIL: database has ${unresolvedIds.size} unresolved prerequisite IDs.`);
    process.exit(1);
  }

  const dbCycle = findCycle(
    (dbRows ?? []).map((row) => ({
      id: row.id,
      prerequisites: row.prerequisites ?? [],
    }))
  );
  if (dbCycle) {
    console.error(`FAIL: database prerequisite cycle detected: ${dbCycle.join(" -> ")}`);
    process.exit(1);
  }

  console.log("OK: database count, current slugs, and prerequisite DAG verified.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
