#!/usr/bin/env node
/**
 * Day 90 verification checklist (prompt #017).
 * Read-only checks against Supabase production/staging DB.
 *
 * Usage: node scripts/verify-day90.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
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
    return;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const SUBJECT = "AP Calculus AB";
const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function warn(name, detail) {
  results.push({ name, ok: null, detail });
  console.log(`WARN  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

async function checkSkillTree() {
  const { count, error } = await supabase
    .from("skill_nodes")
    .select("*", { count: "exact", head: true })
    .eq("subject", SUBJECT);
  if (error) return fail("Skill tree exists", error.message);
  if (count >= 80 && count <= 150) {
    pass("Skill tree exists and is complete", `count=${count} (expected 80–150)`);
  } else {
    fail("Skill tree exists and is complete", `count=${count} (expected 80–150)`);
  }
}

async function checkItemBank() {
  const { data, error } = await supabase.from("item_bank").select("status");
  if (error) return fail("Item bank populated", error.message);
  const byStatus = {};
  for (const row of data ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }
  const approved = byStatus.approved ?? 0;
  const pending =
    (byStatus.pending_review ?? 0) +
    (byStatus.pending ?? 0) +
    (byStatus.draft ?? 0) +
    (byStatus.review ?? 0);
  const total = data?.length ?? 0;
  const detail = Object.entries(byStatus)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([s, n]) => `${s}=${n}`)
    .join(", ");
  if (approved >= 300) {
    pass("Item bank populated and reviewed", `${detail}; approved=${approved} (expected ≥300)`);
  } else {
    fail(
      "Item bank populated and reviewed",
      `${detail}; total=${total}, pending=${pending}, approved=${approved} (expected approved ≥300)`,
    );
  }
}

async function checkNodeCoverage() {
  const { data: nodes, error: nErr } = await supabase
    .from("skill_nodes")
    .select("id, node_name")
    .eq("subject", SUBJECT);
  if (nErr) return fail("Every node has coverage", nErr.message);

  const { data: items, error: iErr } = await supabase
    .from("item_bank")
    .select("skill_node_id")
    .eq("status", "approved");
  if (iErr) return fail("Every node has coverage", iErr.message);

  const counts = new Map();
  for (const item of items ?? []) {
    counts.set(item.skill_node_id, (counts.get(item.skill_node_id) ?? 0) + 1);
  }

  const thin = (nodes ?? []).filter((n) => (counts.get(n.id) ?? 0) < 3);
  const withCoverage = (nodes ?? []).filter((n) => (counts.get(n.id) ?? 0) >= 3).length;
  if (thin.length === 0) {
    pass("Every node has coverage", `all ${nodes?.length ?? 0} nodes have ≥3 approved items`);
  } else {
    const sample = thin.slice(0, 5).map((n) => `${n.node_name}(${counts.get(n.id) ?? 0})`).join(", ");
    fail(
      "Every node has coverage",
      `${thin.length}/${nodes?.length ?? 0} nodes with <3 approved; ${withCoverage} fully covered. e.g. ${sample}`,
    );
  }
}

async function checkNoGeneralTopicTags() {
  const { data: calcQuests, error: qErr } = await supabase
    .from("quests")
    .select("id, metadata, created_at")
    .filter("metadata->>subject", "eq", SUBJECT);
  if (qErr) return fail("No General for AP Calc AB quest tags", qErr.message);

  const questIds = (calcQuests ?? []).map((q) => q.id);
  if (questIds.length === 0) {
    warn("No General for AP Calc AB quest tags", "no AP Calc AB quests found");
    return;
  }

  const { data: tags, error: tErr } = await supabase
    .from("quest_topic_tags")
    .select("quest_id, topic, skill_node_id")
    .in("quest_id", questIds)
    .eq("topic", "General");
  if (tErr) return fail("No General for AP Calc AB quest tags", tErr.message);

  const generalCount = tags?.length ?? 0;
  if (generalCount === 0) {
    pass("No General for AP Calc AB quest tags", `checked ${questIds.length} AP Calc AB quests`);
  } else {
    fail("No General for AP Calc AB quest tags", `${generalCount} General tags on AP Calc AB quests`);
  }
}

async function checkNextReviewAt() {
  const { count, error } = await supabase
    .from("student_knowledge_nodes")
    .select("*", { count: "exact", head: true })
    .not("next_review_at", "is", null);
  if (error) return fail("Ebbinghaus next_review_at set", error.message);
  if ((count ?? 0) > 0) {
    pass("Ebbinghaus next_review_at set", `count=${count}`);
  } else {
    fail("Ebbinghaus next_review_at set", "count=0 (expected non-zero after AP Calc AB quest completions)");
  }
}

async function checkVerifiedFirstAttempts() {
  const { data, error } = await supabase.from("verified_first_attempts").select("user_id");
  if (error) return fail("Verified First Attempts accumulating", error.message);
  const total = data?.length ?? 0;
  const users = new Set((data ?? []).map((r) => r.user_id)).size;
  if (total > 0) {
    pass("Verified First Attempts accumulating", `rows=${total}, distinct users=${users}`);
  } else {
    fail("Verified First Attempts accumulating", "no rows yet");
  }
}

async function checkTelemetry() {
  const { count, error } = await supabase
    .from("telemetry_logs")
    .select("*", { count: "exact", head: true });
  if (error) return fail("Telemetry being recorded", error.message);
  if ((count ?? 0) > 0) {
    pass("Telemetry being recorded", `count=${count}`);
  } else {
    fail("Telemetry being recorded", "count=0 (expected after quest completions)");
  }
}

async function checkSessionGuarantee() {
  const { count, error } = await supabase
    .from("session_target_nodes")
    .select("*", { count: "exact", head: true })
    .not("post_session_checked_at", "is", null);
  if (error) return fail("Guarantee enforcement ready", error.message);
  if ((count ?? 0) > 0) {
    pass("Guarantee enforcement ready", `post_session_checked=${count}`);
  } else {
    fail("Guarantee enforcement ready", "post_session_checked_at all null (no completed sessions yet?)");
  }
}

async function checkCodePaths() {
  const checks = [];

  const tryResults = resolve(root, "src/features/quest/ui/guest-try-results-panel.tsx");
  const tryResultsSrc = readFileSync(tryResults, "utf8");
  if (tryResultsSrc.includes("unit") || tryResultsSrc.includes("weakest") || tryResultsSrc.includes("breakdown")) {
    checks.push("guest try results has breakdown UI");
  } else {
    checks.push("MISSING: guest try per-unit breakdown UI");
  }

  const verifiedGaps = resolve(root, "src/features/pre-session-brief/verified-gaps.ts");
  if (existsSync(verifiedGaps)) {
    checks.push("pre-session verified gaps module exists");
  }

  const recordVfa = resolve(root, "src/features/quest/record-verified-first-attempts.ts");
  if (existsSync(recordVfa)) {
    checks.push("record-verified-first-attempts module exists");
  }

  const hasFail = checks.some((c) => c.startsWith("MISSING"));
  if (hasFail) {
    fail("Code path smoke (static)", checks.join("; "));
  } else {
    pass("Code path smoke (static)", checks.join("; "));
  }
}

console.log("\n=== Day 90 Verification (prompt #017) ===\n");
console.log(`Database: ${url.replace(/https:\/\/([^.]+).*/, "$1")}\n`);

await checkSkillTree();
await checkItemBank();
await checkNodeCoverage();
await checkNoGeneralTopicTags();
await checkNextReviewAt();
await checkVerifiedFirstAttempts();
await checkTelemetry();
await checkSessionGuarantee();
await checkCodePaths();

const failed = results.filter((r) => r.ok === false);
const passed = results.filter((r) => r.ok === true);
const warned = results.filter((r) => r.ok === null);

console.log("\n=== Summary ===");
console.log(`Passed: ${passed.length}  Failed: ${failed.length}  Warn: ${warned.length}`);

console.log("\n=== Manual tests (not automated) ===");
console.log("Test 1: /try → AP Calculus AB → 10 questions → per-unit breakdown + weakest area");
console.log("Test 2: /try → other subject → unchanged behavior");
console.log("Test 3: Student AP Calc AB practice → quest_topic_tags has skill_node_id not General");
console.log("Test 4: 2 quests same node → verified_first_attempts has exactly 1 row per user+node");
console.log("Test 5: Guide upcoming AP Calc AB session → brief shows Verified gaps with node names");

process.exit(failed.length > 0 ? 1 : 0);
