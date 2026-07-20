#!/usr/bin/env npx tsx
/**
 * Pilot: tag approved Chain Rule / related items with secondary skill slugs.
 *
 * Usage:
 *   npx tsx scripts/seed-secondary-skill-tags.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUBJECT = "AP Calculus AB";

/** Surface node slug → secondary cause slugs (reviewed, not AI). */
const PILOT: Record<string, string[]> = {
  "chain-rule-basics": ["power-rule", "derivatives-of-sin-x-and-cos-x"],
  "chain-rule-with-composite-functions": ["chain-rule-basics", "power-rule"],
  "selecting-a-differentiation-technique": ["chain-rule-basics", "power-rule"],
  "implicit-differentiation-basics": ["chain-rule-basics", "power-rule"],
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

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const slugs = Object.keys(PILOT);
  const { data: nodes, error: nodesError } = await supabase
    .from("skill_nodes")
    .select("id, node_slug")
    .eq("subject", SUBJECT)
    .in("node_slug", slugs);

  if (nodesError) {
    console.error(nodesError.message);
    process.exit(1);
  }

  let updated = 0;
  for (const node of nodes ?? []) {
    const tags = PILOT[node.node_slug];
    if (!tags) continue;
    const { error, count } = await supabase
      .from("item_bank")
      .update({ secondary_skill_tags: tags })
      .eq("skill_node_id", node.id)
      .eq("status", "approved");
    if (error) {
      console.error(node.node_slug, error.message);
      process.exit(1);
    }
    updated += count ?? 0;
    console.log(`${node.node_slug}: tagged approved items (${tags.join(", ")})`);
  }

  console.log(`Done. Rows touched (supabase count may be null): ${updated}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
