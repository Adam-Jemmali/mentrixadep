#!/usr/bin/env npx tsx
/**
 * Gate-based auto-approve for construction item_bank rows.
 * Does NOT use Gemini. Approves only when machine-gradeable ground truth is present.
 *
 * Usage:
 *   npx tsx scripts/auto-approve-construction-items.ts
 *   npx tsx scripts/auto-approve-construction-items.ts --limit=100 --dry-run
 *   npx tsx scripts/auto-approve-construction-items.ts --seed-templates
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONSTRUCTION_AUTO_APPROVE_REVIEWER,
  shouldAttemptConstructionAutoApprove,
  validateConstructionGroundTruth,
} from "../src/features/quest/construction-auto-approve-pure";
import { buildConstructionTemplatesForNode } from "./lib/construction-item-templates-pure";

const SUBJECT = "AP Calculus AB";

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

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.slice(name.length + 1));
  return Number.isFinite(n) ? n : fallback;
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const dryRun = argFlag("--dry-run");
  const seedTemplates = argFlag("--seed-templates");
  const limit = argValue("--limit", 200);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (seedTemplates) {
    const { data: nodes, error: nodesError } = await supabase
      .from("skill_nodes")
      .select("id, node_name")
      .eq("subject", SUBJECT)
      .order("display_order")
      .limit(200);

    if (nodesError || !nodes?.length) {
      console.error("No skill nodes to seed:", nodesError?.message);
      process.exit(1);
    }

    let inserted = 0;
    for (const node of nodes) {
      const templates = buildConstructionTemplatesForNode(node.node_name);
      const rows = templates.map((t) => ({
        skill_node_id: node.id,
        question_type: t.item_format,
        item_format: t.item_format,
        prompt: t.prompt,
        options: t.options,
        correct_answer: t.correct_answer,
        answer_expression: t.answer_expression,
        explanation: t.explanation,
        distractor_tags: {},
        difficulty_rating: t.difficulty_rating,
        status: "pending_review",
        solution_steps: t.solution_steps,
        partial_credit_rules: [],
        stimulus: t.stimulus,
        authoring_meta: t.authoring_meta,
        step_sequence: null,
      }));
      if (dryRun) {
        console.log(`[dry-run] would insert ${rows.length} construction templates for ${node.node_name}`);
        continue;
      }
      const { error } = await supabase.from("item_bank").insert(rows);
      if (error) {
        console.error(`[fail] seed ${node.node_name}:`, error.message);
        continue;
      }
      inserted += rows.length;
      console.log(`[seed] ${node.node_name}: ${rows.length} construction items`);
    }
    console.log(`Seeded ${inserted} construction items (pending_review).`);
  }

  const { data: pending, error } = await supabase
    .from("item_bank")
    .select(
      "id, item_format, prompt, options, correct_answer, answer_expression, explanation, solution_steps, stimulus, authoring_meta",
    )
    .eq("status", "pending_review")
    .in("item_format", [
      "free_response",
      "complete_expression",
      "drag_order",
      "graph_feature",
      "multi_part",
    ])
    .limit(limit);

  if (error) {
    console.error("Failed to load pending construction items:", error.message);
    process.exit(1);
  }

  if (!pending?.length) {
    console.log("No pending construction items to auto-approve.");
    return;
  }

  let approved = 0;
  let skipped = 0;
  for (const row of pending) {
    if (!shouldAttemptConstructionAutoApprove(row.item_format)) {
      skipped += 1;
      continue;
    }
    const gate = validateConstructionGroundTruth({
      itemFormat: row.item_format,
      prompt: row.prompt,
      options: row.options,
      correctAnswer: row.correct_answer,
      answerExpression: row.answer_expression,
      solutionSteps: row.solution_steps,
      stimulus: row.stimulus,
      authoringMeta: row.authoring_meta,
      explanation: row.explanation,
    });
    if (!gate.ok) {
      skipped += 1;
      console.log(`[skip] ${row.id}: ${gate.reasons[0]}`);
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] would approve ${row.id} (${row.item_format})`);
      approved += 1;
      continue;
    }
    const { error: updateError } = await supabase
      .from("item_bank")
      .update({
        status: "approved",
        reviewed_by: CONSTRUCTION_AUTO_APPROVE_REVIEWER,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending_review");
    if (updateError) {
      console.error(`[fail] approve ${row.id}:`, updateError.message);
      skipped += 1;
      continue;
    }
    approved += 1;
    console.log(`[approve] ${row.id} (${row.item_format})`);
  }

  console.log(
    `Done. Approved ${approved}. Skipped ${skipped}. Reviewer=${CONSTRUCTION_AUTO_APPROVE_REVIEWER}.`,
  );
  console.log("Next: open a practice pack — construction items are student-visible when approved.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
