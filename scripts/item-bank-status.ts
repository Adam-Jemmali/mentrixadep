#!/usr/bin/env npx tsx
/**
 * Weekly AP Calculus AB item bank coverage report.
 *
 * Usage: npm run item-bank:status
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUBJECT,
  MIN_APPROVED_PER_NODE,
  MIN_GLOBAL_APPROVED,
  MAX_GLOBAL_APPROVED,
  MIN_STEP_TRACE_UNITS_1_3,
  buildNodeStatusRows,
  formatCoverageVerdict,
  formatStatusTable,
  summarizeCoverage,
  type ItemBankInput,
  type SkillNodeInput,
} from "./lib/item-bank-status-pure";

const PAGE_SIZE = 1000;

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

async function fetchAllItems(
  supabase: SupabaseClient,
  nodeIds: string[],
): Promise<ItemBankInput[]> {
  if (nodeIds.length === 0) return [];

  const rows: ItemBankInput[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("item_bank")
      .select("skill_node_id, status, step_sequence")
      .in("skill_node_id", nodeIds)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load item_bank rows: ${error.message}`);
    }

    const page = (data ?? []) as ItemBankInput[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
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

  const { data: nodes, error: nodesError } = await supabase
    .from("skill_nodes")
    .select("id, node_name, unit_name, unit_number")
    .eq("subject", SUBJECT)
    .order("display_order");

  if (nodesError) {
    console.error(`Failed to load skill_nodes: ${nodesError.message}`);
    process.exit(1);
  }

  const skillNodes = (nodes ?? []) as SkillNodeInput[];
  const nodeIds = skillNodes.map((node) => node.id);
  const items = await fetchAllItems(supabase, nodeIds);
  const rows = buildNodeStatusRows(skillNodes, items);
  const summary = summarizeCoverage(skillNodes, items);
  const useColor = process.stdout.isTTY === true;

  console.log(`${SUBJECT} item bank status`);
  console.log(
    `Totals: approved=${summary.approved_total} (target ${MIN_GLOBAL_APPROVED}-${MAX_GLOBAL_APPROVED}), pending=${summary.pending_total}, rejected=${summary.rejected_total}`,
  );
  console.log(
    `Step-trace pool Units 1-3: ${summary.step_trace_units_1_3} approved rows (target ${MIN_STEP_TRACE_UNITS_1_3}+)`,
  );
  console.log(
    `Flagged: ${summary.nodes_below_min} nodes below ${MIN_APPROVED_PER_NODE} approved, ${summary.nodes_missing_step_trace} nodes without step-trace items`,
  );
  console.log("");
  console.log(formatStatusTable(rows, useColor));
  console.log("");
  console.log(formatCoverageVerdict(summary));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
