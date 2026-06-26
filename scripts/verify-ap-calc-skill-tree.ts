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
import { MIN_NODES, MAX_NODES, SUBJECT, loadNodes } from "./ap-calc-ab-skill-nodes.test";

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

  const nodes = loadNodes();
  console.log(`Seed file: ${nodes.length} nodes for "${SUBJECT}" (${MIN_NODES}–${MAX_NODES} expected).`);

  if (nodes.length < MIN_NODES || nodes.length > MAX_NODES) {
    console.error("FAIL: node count out of range.");
    process.exit(1);
  }

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

  const { count, error } = await supabase
    .from("skill_nodes")
    .select("*", { count: "exact", head: true })
    .eq("subject", SUBJECT);

  if (error) {
    console.error("DB count failed:", error.message);
    console.log("Run migration 104 and 114, then: npm run skill-tree:seed");
    process.exit(1);
  }

  const dbCount = count ?? 0;
  console.log(`Database: ${dbCount} rows for "${SUBJECT}".`);

  if (dbCount < MIN_NODES || dbCount > MAX_NODES) {
    console.error("FAIL: database count out of range. Run: npm run skill-tree:seed");
    process.exit(1);
  }

  console.log("OK: database count in range.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
