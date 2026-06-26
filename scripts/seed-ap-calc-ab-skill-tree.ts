#!/usr/bin/env npx tsx
/**
 * One time seed: AP Calculus AB skill_nodes from College Board CED (8 units).
 *
 * Usage:
 *   npx tsx scripts/seed-ap-calc-ab-skill-tree.ts
 *   npx tsx scripts/seed-ap-calc-ab-skill-tree.ts --force
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUBJECT = "AP Calculus AB";
const MIN_NODES = 100;
const MAX_NODES = 150;

type SkillNodeSeed = {
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  description: string;
  common_misconceptions: string[];
  display_order: number;
};

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
  const path = resolve(dirname(fileURLToPath(import.meta.url)), "data/ap-calc-ab-skill-nodes.json");
  return JSON.parse(readFileSync(path, "utf8")) as SkillNodeSeed[];
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nodes = loadNodes();
  if (nodes.length < MIN_NODES || nodes.length > MAX_NODES) {
    console.error(
      `Expected ${MIN_NODES}–${MAX_NODES} nodes in data file, got ${nodes.length}.`
    );
    process.exit(1);
  }

  const canonicalSlugs = new Set(nodes.map((node) => node.node_slug));

  const { count: existingCount, error: countError } = await supabase
    .from("skill_nodes")
    .select("*", { count: "exact", head: true })
    .eq("subject", SUBJECT);

  if (countError) {
    console.error("Failed to count existing rows:", countError.message);
    process.exit(1);
  }

  if ((existingCount ?? 0) >= MIN_NODES && (existingCount ?? 0) <= MAX_NODES && !force) {
    console.log(
      `Already seeded: ${existingCount} rows for "${SUBJECT}" (${MIN_NODES}–${MAX_NODES}). Use --force to re upsert.`
    );
    process.exit(0);
  }

  const rows = nodes.map((node) => ({
    subject: SUBJECT,
    unit_number: node.unit_number,
    unit_name: node.unit_name,
    node_name: node.node_name,
    node_slug: node.node_slug,
    description: node.description,
    common_misconceptions: node.common_misconceptions,
    display_order: node.display_order,
    prerequisites: [] as string[],
  }));

  const { error: upsertError } = await supabase
    .from("skill_nodes")
    .upsert(rows, { onConflict: "subject,node_slug" });
  if (upsertError) {
    console.error("Upsert failed:", upsertError.message);
    process.exit(1);
  }

  const { data: allSubjectRows, error: fetchAllError } = await supabase
    .from("skill_nodes")
    .select("id, node_slug")
    .eq("subject", SUBJECT);

  if (fetchAllError || !allSubjectRows) {
    console.error("Failed to fetch subject rows:", fetchAllError?.message);
    process.exit(1);
  }

  const orphanIds = allSubjectRows
    .filter((row) => !canonicalSlugs.has(row.node_slug))
    .map((row) => row.id);

  if (orphanIds.length > 0) {
    const { data: refs } = await supabase.from("item_bank").select("skill_node_id");
    const referenced = new Set((refs ?? []).map((row) => row.skill_node_id));
    const safeToDelete = orphanIds.filter((id) => !referenced.has(id));

    if (safeToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("skill_nodes")
        .delete()
        .in("id", safeToDelete);
      if (deleteError) {
        console.error("Failed to remove orphan rows:", deleteError.message);
        process.exit(1);
      }
      console.log(`Removed ${safeToDelete.length} orphan rows.`);
    }

    const blocked = orphanIds.length - safeToDelete.length;
    if (blocked > 0) {
      console.warn(`${blocked} orphan rows kept due to item_bank references.`);
    }
  }

  const { data: inserted, error: fetchError } = await supabase
    .from("skill_nodes")
    .select("id, unit_number, display_order, node_slug")
    .eq("subject", SUBJECT)
    .in("node_slug", [...canonicalSlugs])
    .order("display_order");

  if (fetchError || !inserted) {
    console.error("Failed to fetch canonical rows:", fetchError?.message);
    process.exit(1);
  }

  const byUnit = new Map<number, { id: string }[]>();
  for (const row of inserted) {
    const list = byUnit.get(row.unit_number) ?? [];
    list.push({ id: row.id });
    byUnit.set(row.unit_number, list);
  }

  let linked = 0;
  for (const unitNodes of byUnit.values()) {
    for (let i = 0; i < unitNodes.length; i++) {
      const prereqs = i === 0 ? [] : [unitNodes[i - 1]!.id];
      const { error: updateError } = await supabase
        .from("skill_nodes")
        .update({ prerequisites: prereqs })
        .eq("id", unitNodes[i]!.id);
      if (updateError) {
        console.error("Prerequisite update failed:", updateError.message);
        process.exit(1);
      }
      linked++;
    }
  }

  const { count: finalCount, error: finalCountError } = await supabase
    .from("skill_nodes")
    .select("*", { count: "exact", head: true })
    .eq("subject", SUBJECT);

  if (finalCountError) {
    console.error("Failed to verify count:", finalCountError.message);
    process.exit(1);
  }

  console.log(`Upserted ${rows.length} skill_nodes for "${SUBJECT}".`);
  console.log(`Total rows for subject: ${finalCount}.`);
  console.log(`Linked prerequisites for ${linked} nodes across ${byUnit.size} units.`);
  const inRange =
    finalCount !== null &&
    finalCount >= MIN_NODES &&
    finalCount <= MAX_NODES;
  console.log(
    `Range ${MIN_NODES}–${MAX_NODES}: ${inRange ? "OK" : "MISMATCH — run assert_ap_calc_ab_skill_nodes after migration 114"}.`
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
