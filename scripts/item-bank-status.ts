#!/usr/bin/env npx tsx
/**
 * Print AP Calculus AB item bank coverage stats.
 *
 * Usage: npx tsx scripts/item-bank-status.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUBJECT = "AP Calculus AB";
const MIN_GLOBAL = 300;
const MAX_GLOBAL = 500;
const MIN_PER_NODE = 3;

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
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: nodes } = await supabase
    .from("skill_nodes")
    .select("id, node_name, unit_number")
    .eq("subject", SUBJECT)
    .order("display_order");

  const nodeIds = (nodes ?? []).map((n) => n.id);
  const { data: items } = await supabase
    .from("item_bank")
    .select("skill_node_id, status")
    .in("skill_node_id", nodeIds.length ? nodeIds : ["00000000-0000-0000-0000-000000000000"]);

  const approvedByNode = new Map<string, number>();
  let approved = 0;
  let pending = 0;
  let rejected = 0;

  for (const row of items ?? []) {
    if (row.status === "approved") {
      approved++;
      approvedByNode.set(row.skill_node_id, (approvedByNode.get(row.skill_node_id) ?? 0) + 1);
    } else if (row.status === "pending_review") pending++;
    else if (row.status === "rejected") rejected++;
  }

  const below = (nodes ?? []).filter((n) => (approvedByNode.get(n.id) ?? 0) < MIN_PER_NODE);

  console.log(`AP Calculus AB item bank`);
  console.log(`  Approved: ${approved} (target ${MIN_GLOBAL}–${MAX_GLOBAL})`);
  console.log(`  Pending: ${pending}  Rejected: ${rejected}`);
  console.log(`  Nodes below ${MIN_PER_NODE} approved: ${below.length} / ${nodes?.length ?? 0}`);

  if (below.length > 0 && below.length <= 15) {
    for (const n of below) {
      console.log(`    U${n.unit_number} ${n.node_name}: ${approvedByNode.get(n.id) ?? 0}`);
    }
  }

  const ok = approved >= MIN_GLOBAL && approved <= MAX_GLOBAL && below.length === 0;
  console.log(ok ? "OK: coverage target met." : "GAP: run npm run item-bank:generate");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
