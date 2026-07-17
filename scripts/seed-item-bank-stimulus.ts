#!/usr/bin/env npx tsx
/**
 * Seed the particle velocity midpoint Riemann sample (table + graph stimulus).
 *
 * Usage:
 *   npm run item-bank:seed-stimulus
 *   npm run item-bank:seed-stimulus -- --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUBJECT = "AP Calculus AB";
const NODE_SLUG = "riemann-sums-left-right-and-midpoint";
const REVIEWED_BY = "stimulus-seed";

const ITEM = {
  item_format: "mcq",
  question_type: "mcq",
  prompt:
    "The velocity of a particle, in meters per second, is given by selected values in the table. Using a midpoint Riemann sum with 3 equal subintervals, approximate the total distance traveled by the particle from t = 0 to t = 6 seconds.",
  options: ["78 meters", "70 meters", "66 meters", "62 meters"],
  correct_answer: "78 meters",
  explanation:
    "Subinterval width is 2. Midpoints are t = 1, 3, and 5 with velocities 5, 18, and 16. Distance ≈ 2(5 + 18 + 16) = 78 meters.",
  distractor_tags: {
    "70 meters": "Uses left Riemann sum 2(0+12+20)",
    "66 meters": "Uses right Riemann sum 2(12+20+10)",
    "62 meters": "Averages endpoints instead of midpoints",
  },
  difficulty_rating: 1100,
  status: "approved",
  reviewed_by: REVIEWED_BY,
  stimulus: [
    {
      kind: "table",
      title: "Particle velocity",
      headers: ["t (seconds)", "v(t) (m/s)"],
      rows: [
        ["0", "0"],
        ["1", "5"],
        ["2", "12"],
        ["3", "18"],
        ["4", "20"],
        ["5", "16"],
        ["6", "10"],
      ],
    },
    {
      kind: "function_graph",
      title: "Midpoint Riemann sum",
      alt: "Velocity points with three midpoint rectangles from t equals 0 to 6",
      xLabel: "t (s)",
      yLabel: "v (m/s)",
      domain: [0, 6],
      range: [0, 24],
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 5 },
        { x: 2, y: 12 },
        { x: 3, y: 18 },
        { x: 4, y: 20 },
        { x: 5, y: 16 },
        { x: 6, y: 10 },
      ],
      riemann: {
        method: "midpoint",
        from: 0,
        to: 6,
        n: 3,
        heights: [5, 18, 16],
      },
    },
  ],
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
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: node, error: nodeError } = await supabase
    .from("skill_nodes")
    .select("id, node_name")
    .eq("subject", SUBJECT)
    .eq("node_slug", NODE_SLUG)
    .maybeSingle();

  if (nodeError || !node) {
    console.error(`Skill node not found: ${NODE_SLUG}`, nodeError?.message ?? "");
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("item_bank")
    .select("id")
    .eq("skill_node_id", node.id)
    .eq("prompt", ITEM.prompt)
    .maybeSingle();

  if (existing?.id) {
    if (dryRun) {
      console.log(`[dry-run] Would update stimulus on existing item ${existing.id}`);
      return;
    }
    const { error } = await supabase
      .from("item_bank")
      .update({
        stimulus: ITEM.stimulus,
        options: ITEM.options,
        correct_answer: ITEM.correct_answer,
        explanation: ITEM.explanation,
        distractor_tags: ITEM.distractor_tags,
        difficulty_rating: ITEM.difficulty_rating,
        status: "approved",
        reviewed_by: REVIEWED_BY,
        reviewed_at: new Date().toISOString(),
        item_format: "mcq",
      })
      .eq("id", existing.id);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log(`Updated stimulus on ${existing.id} (${node.node_name}).`);
    console.log("Next action: start an AP Calculus AB practice pack that hits Riemann sums.");
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would insert velocity Riemann item on ${node.node_name}`);
    return;
  }

  const { data: inserted, error } = await supabase
    .from("item_bank")
    .insert({
      skill_node_id: node.id,
      ...ITEM,
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`Inserted ${inserted?.id} with table + graph stimulus on ${node.node_name}.`);
  console.log("Next action: start an AP Calculus AB practice pack that hits Riemann sums.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
