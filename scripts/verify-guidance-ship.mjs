#!/usr/bin/env node
/**
 * Guidance layer ship gate — static + optional DB checks.
 * Usage: node scripts/verify-guidance-ship.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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

const results = [];

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`PASS  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function warn(name, detail) {
  results.push({ ok: null, name, detail });
  console.log(`WARN  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function grepSrc(pattern) {
  try {
    const out = execSync(`rg -l "${pattern}" src --glob "*.{ts,tsx}"`, {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out ? out.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

console.log("\n=== Guidance layer ship verification ===\n");

// ─── Dropped tables (src must not reference) ─────────────────────────────────

const dropped = ["telemetry_logs", "student_diagnostic_profiles", "session_bundles"];
for (const table of dropped) {
  const hits = grepSrc(table);
  if (hits.length === 0) pass(`No src references to ${table}`, "grep clean");
  else fail(`No src references to ${table}`, hits.join(", "));
}

const duelQueueHits = grepSrc("duel_queue");
if (duelQueueHits.length > 0) {
  warn(
    "duel_queue references remain",
    "intentional per supabase/130-production-cleanup.sql (live matchmaking); checklist item differs",
  );
} else {
  pass("duel_queue", "no src references");
}

// ─── Verdict wiring (five screens) ───────────────────────────────────────────

const verdictScreens = [
  ["Quest done", "src/features/mastery-grid/quest-mastery-done-panel.tsx", "VerdictPanel"],
  ["Duel results", "src/features/duels/ui/skill-duel-results.tsx", "VerdictPanel"],
  ["Progress email", "src/features/progress-snapshot/send-progress-snapshots-cron.ts", "getVerdict"],
  ["Impact dashboard", "src/features/tutor/command-center.ts", "getVerdict"],
  ["Mastery grid", "src/features/mastery-grid/mastery-grid.tsx", "VerdictPanel"],
];

for (const [label, file, needle] of verdictScreens) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    fail(`${label} verdict wiring`, `missing ${file}`);
    continue;
  }
  const src = readFileSync(path, "utf8");
  if (src.includes(needle)) pass(`${label} uses Verdict Engine`, file);
  else fail(`${label} uses Verdict Engine`, `${needle} not found in ${file}`);
}

// ─── Intervention retest triggers ────────────────────────────────────────────

const retestTriggers = [
  "scheduleSessionCompletionRetests",
  "scheduleStudioPackageRetests",
  "scheduleBreakthroughRetest",
  "scheduleDuelLossRetest",
];
const scheduleSrc = read("src/features/intervention-retests/schedule-intervention-retests.ts");
for (const fn of retestTriggers) {
  if (scheduleSrc.includes(`export async function ${fn}`)) {
    pass(`Retest trigger exported: ${fn}`, "schedule-intervention-retests.ts");
  } else {
    fail(`Retest trigger exported: ${fn}`, "missing export");
  }
}

if (read("supabase/126-intervention-retests.sql").includes("intervention_retests_source_node_unique")) {
  pass("Retest idempotency constraint", "UNIQUE (source_type, source_id, skill_node_id)");
} else {
  fail("Retest idempotency constraint", "unique constraint not found in migration");
}

if (read("supabase/127-user-notifications.sql").includes("intervention_retests_guide_notify")) {
  pass("Guide notification on retest complete", "DB trigger intervention_retests_guide_notify");
} else {
  fail("Guide notification on retest complete", "trigger missing");
}

// ─── Peer comparison cron ────────────────────────────────────────────────────

const vercel = read("vercel.json");
if (vercel.includes('"/api/cron/sync-peer-comparison"')) {
  const hourly = /sync-peer-comparison[\s\S]*?"schedule":\s*"0 \* \* \* \*"/.test(vercel);
  if (hourly) {
    fail("Peer comparison cron", "hourly schedule blocks Vercel Hobby deploys — use daily in vercel.json");
  } else {
    pass("Peer comparison cron", "daily schedule (Hobby-safe)");
  }
} else {
  fail("Peer comparison cron", "route missing from vercel.json");
}

// ─── Try flow hardening ──────────────────────────────────────────────────────

const tryChecks = [
  ["guest-diagnostic start API", "src/app/api/guest-diagnostic/start/route.ts"],
  ["signed guest session", "src/features/diagnostics/guest-try-session.ts"],
  ["step trace selector", "src/features/diagnostics/select-guest-step-trace-item.ts"],
  ["diagnostic verdict pure", "src/features/diagnostics/diagnostic-verdict.ts"],
  ["guest diagnostic load test", "load-tests/guest-diagnostic.js"],
];

for (const [label, file] of tryChecks) {
  if (existsSync(resolve(root, file))) pass(`Try flow: ${label}`, file);
  else fail(`Try flow: ${label}`, `missing ${file}`);
}

if (read("src/features/diagnostics/guest-diagnostic-start-api.ts").includes("enforceApiRouteRateLimit")) {
  pass("Try flow IP rate limit", "guest.practice bucket");
} else {
  fail("Try flow IP rate limit", "enforceApiRouteRateLimit missing");
}

// ─── Unit tests ──────────────────────────────────────────────────────────────

try {
  execSync(
    "npm run test:ci -- src/features/diagnostics src/features/guidance src/features/student-goals src/shared/integrations/email/templates/progress-snapshot-email.test.ts",
    { cwd: root, stdio: "pipe" },
  );
  pass("Guidance unit tests", "vitest green");
} catch (e) {
  fail("Guidance unit tests", e.stderr?.toString()?.slice(0, 400) ?? "failed");
}

// ─── Optional DB checks ───────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && key) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { count: nodeRows } = await supabase
    .from("node_percentile_snapshot")
    .select("*", { count: "exact", head: true });
  const { count: guideRows } = await supabase
    .from("guide_impact_percentile_snapshot")
    .select("*", { count: "exact", head: true });
  if ((nodeRows ?? 0) > 0 && (guideRows ?? 0) > 0) {
    pass("Peer snapshot tables populated", `node=${nodeRows}, guide=${guideRows}`);
  } else {
    warn(
      "Peer snapshot tables populated",
      `node=${nodeRows ?? 0}, guide=${guideRows ?? 0} — run /api/cron/sync-peer-comparison once`,
    );
  }

  const { count: stepTraceItems } = await supabase
    .from("item_bank")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .not("step_sequence", "is", null);
  if ((stepTraceItems ?? 0) >= 1) {
    pass("Step trace item bank seeded", `count=${stepTraceItems}`);
  } else {
    warn("Step trace item bank seeded", "no approved rows with step_sequence — try flow returns 503");
  }
} else {
  warn("Database checks", "skipped — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const failed = results.filter((r) => r.ok === false);
const passed = results.filter((r) => r.ok === true);
const warned = results.filter((r) => r.ok === null);

console.log("\n=== Summary ===");
console.log(`Passed: ${passed.length}  Failed: ${failed.length}  Warn: ${warned.length}`);

console.log("\n=== Manual only (production) ===");
console.log("1. Insert Studio publish → intervention_retests row; repeat → 23505 duplicate suppressed");
console.log("2. Advance retest scheduled_for → complete → guide notification panel row");
console.log("3. New verified attempt → student_node_rolling_stats.last_updated moves (no full table scan in logs)");
console.log("4. Active student_goal with near target_date → getVerdict nextAction differs vs no goal");
console.log("5. /try step trace: all-correct path + misconception path in browser");
console.log("6. k6: k6 run -e BASE_URL=... load-tests/guest-diagnostic.js at 1K VUs");

process.exit(failed.length > 0 ? 1 : 0);
