#!/usr/bin/env npx tsx
/**
 * Seed reviewed step_sequence JSON onto approved item_bank rows for Units 1-3.
 *
 * Usage:
 *   npm run item-bank:seed-step-trace
 *   npm run item-bank:seed-step-trace -- --dry-run
 *   npm run item-bank:seed-step-trace -- --force
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSeedNodesInUnits,
  assignStepTraceSeeds,
  loadStepTraceSeedEntries,
  MIN_STEP_TRACE_SEED_COUNT,
  type ApprovedItemRef,
  type SkillNodeRef,
} from "./lib/step-trace-seed-pure";

const SUBJECT = "AP Calculus AB";
const REVIEWED_BY = "step-trace-seed";

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

function loadSeedFile(): ReturnType<typeof loadStepTraceSeedEntries> {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "data/ap-calc-ab-step-trace-sequences.json",
  );
  return loadStepTraceSeedEntries(JSON.parse(readFileSync(path, "utf8")));
}

async function main(): Promise<void> {
  loadEnv();

  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const entries = loadSeedFile();
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: nodes, error: nodesError } = await supabase
    .from("skill_nodes")
    .select("id, node_slug, unit_number")
    .eq("subject", SUBJECT);

  if (nodesError) {
    console.error(`Failed to load skill_nodes: ${nodesError.message}`);
    process.exit(1);
  }

  const nodesBySlug = new Map<string, SkillNodeRef>();
  for (const row of (nodes ?? []) as SkillNodeRef[]) {
    nodesBySlug.set(row.node_slug, row);
  }

  assertSeedNodesInUnits(entries, nodesBySlug);

  const nodeIds = [...nodesBySlug.values()]
    .filter((node) => node.unit_number >= 1 && node.unit_number <= 3)
    .map((node) => node.id);

  const { data: items, error: itemsError } = await supabase
    .from("item_bank")
    .select("id, skill_node_id, step_sequence")
    .eq("status", "approved")
    .in("skill_node_id", nodeIds.length ? nodeIds : ["00000000-0000-0000-0000-000000000000"]);

  if (itemsError) {
    console.error(`Failed to load item_bank rows: ${itemsError.message}`);
    process.exit(1);
  }

  const { assignments, skipped, missing } = assignStepTraceSeeds(
    entries,
    nodesBySlug,
    (items ?? []) as ApprovedItemRef[],
    force,
  );

  console.log(
    `Loaded ${entries.length} reviewed step-trace seeds (minimum ${MIN_STEP_TRACE_SEED_COUNT}).`,
  );
  console.log(
    `Plan: ${assignments.length} update(s), ${skipped.length} skipped, ${missing.length} missing${dryRun ? " (dry run)" : ""}.`,
  );

  for (const row of assignments) {
    console.log(`  ${row.seed_id} -> ${row.node_slug} (${row.item_id})`);
  }
  for (const row of skipped) console.log(`  skip: ${row}`);
  for (const row of missing) console.log(`  missing: ${row}`);

  if (missing.length > 0) {
    console.error("Cannot seed all step-trace entries.");
    process.exit(1);
  }

  if (assignments.length === 0) {
    console.log("Nothing to update. Use --force to reapply existing step_sequence rows.");
    return;
  }

  if (dryRun) return;

  const reviewedAt = new Date().toISOString();
  let updated = 0;

  for (const row of assignments) {
    const { error } = await supabase
      .from("item_bank")
      .update({
        prompt: row.prompt,
        step_sequence: row.step_sequence,
        reviewed_by: REVIEWED_BY,
        reviewed_at: reviewedAt,
      })
      .eq("id", row.item_id);

    if (error) {
      console.error(`Failed to update ${row.seed_id} (${row.item_id}): ${error.message}`);
      process.exit(1);
    }
    updated += 1;
  }

  console.log(`Seeded step_sequence on ${updated} approved item_bank row(s).`);
  console.log("Next action: run npm run item-bank:status to verify Units 1-3 pool >= 15.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
