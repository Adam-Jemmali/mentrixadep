#!/usr/bin/env npx tsx
/**
 * Auto verify pending_review item_bank rows with a second Gemini pass.
 * Approved items become student visible immediately. No admin clicks required.
 *
 * Usage:
 *   npx tsx scripts/auto-verify-item-bank.ts
 *   npx tsx scripts/auto-verify-item-bank.ts --limit=50
 *   npx tsx scripts/auto-verify-item-bank.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeQuestion,
  verifyQuestionWithGemini,
  type ItemBankQuestionInput,
} from "./lib/item-bank-auto-verify";

const SUBJECT = "AP Calculus AB";
const BATCH_DELAY_MS = 400;
const REVIEWED_BY = "gemini-auto";

type SkillNodeJoin = {
  node_name: string;
  node_slug: string;
  description: string | null;
  common_misconceptions: string[] | null;
};

type PendingRow = {
  id: string;
  skill_node_id: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  distractor_tags: unknown;
  skill_nodes: SkillNodeJoin | null;
};

function normalizePendingRow(raw: {
  id: string;
  skill_node_id: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  distractor_tags: unknown;
  skill_nodes: SkillNodeJoin | SkillNodeJoin[] | null;
}): PendingRow {
  const skillNodes = raw.skill_nodes;
  const node = Array.isArray(skillNodes) ? (skillNodes[0] ?? null) : skillNodes;
  return { ...raw, skill_nodes: node };
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function parseOptions(value: unknown): [string, string, string, string] | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const options = value.filter((entry): entry is string => typeof entry === "string");
  if (options.length !== 4) return null;
  return options as [string, string, string, string];
}

function parseDistractorTags(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, tag] of Object.entries(value)) {
    if (typeof tag === "string") out[key] = tag;
  }
  return out;
}

function toQuestionInput(row: PendingRow): ItemBankQuestionInput | null {
  const options = parseOptions(row.options);
  if (!options) return null;
  try {
    return normalizeQuestion({
      prompt: row.prompt,
      options,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      distractor_tags: parseDistractorTags(row.distractor_tags),
    });
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!url || !serviceKey || !apiKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY are required.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1]
    ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : undefined);
  const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("item_bank")
    .select(
      "id, skill_node_id, prompt, options, correct_answer, explanation, distractor_tags, skill_nodes!item_bank_skill_node_id_fkey(node_name, node_slug, description, common_misconceptions)"
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load pending_review items:", error.message);
    process.exit(1);
  }

  const rows = (data ?? []).map(normalizePendingRow);
  if (rows.length === 0) {
    console.log("No pending_review items to verify.");
    return;
  }

  console.log(`Verifying ${rows.length} pending item(s) for "${SUBJECT}"${dryRun ? " (dry run)" : ""}.`);

  let approved = 0;
  let rejected = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const node = row.skill_nodes;
    if (!node) {
      skipped++;
      console.log(`[skip] ${row.id}: missing skill node`);
      continue;
    }

    const question = toQuestionInput(row);
    if (!question) {
      skipped++;
      if (!dryRun) {
        await supabase
          .from("item_bank")
          .update({
            status: "rejected",
            reviewed_by: REVIEWED_BY,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      console.log(`[reject-structure] ${node.node_name}: invalid shape`);
      rejected++;
      continue;
    }

    if (i > 0) await sleep(BATCH_DELAY_MS);

    const outcome = await verifyQuestionWithGemini(apiKey, node, question);
    if (outcome.approved) {
      approved++;
      if (!dryRun) {
        await supabase
          .from("item_bank")
          .update({
            status: "approved",
            reviewed_by: REVIEWED_BY,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      console.log(`[approve] ${node.node_name}: ${outcome.reason}`);
    } else {
      rejected++;
      if (!dryRun) {
        await supabase
          .from("item_bank")
          .update({
            status: "rejected",
            reviewed_by: REVIEWED_BY,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      console.log(`[reject] ${node.node_name}: ${outcome.reason}`);
    }
  }

  console.log(`Done. approved=${approved}, rejected=${rejected}, skipped=${skipped}${dryRun ? " (no DB writes)" : ""}.`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
