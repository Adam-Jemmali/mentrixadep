#!/usr/bin/env npx tsx
/**
 * P0 RLS integration checks against a live Supabase project.
 *
 * Usage: npx tsx scripts/test-rls-policies.ts
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   RLS_TEST_USER_EMAIL + RLS_TEST_USER_PASSWORD (authenticated item_bank INSERT test)
 *
 * Optional: SUPABASE_SERVICE_ROLE_KEY (connectivity probe only; tests use anon/authed clients)
 *
 * Skips with exit 0 when URL/anon key are CI placeholders or unset.
 */

import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_RE = /placeholder/i;
const RANDOM_USER_ID = "00000000-0000-4000-8000-000000000001";
const RANDOM_NODE_ID = "00000000-0000-4000-8000-000000000002";
const RANDOM_ITEM_ID = "00000000-0000-4000-8000-000000000003";

type TestCase = {
  name: string;
  run: (ctx: TestContext) => Promise<void>;
};

type TestContext = {
  anon: SupabaseClient;
  authed: SupabaseClient;
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

function isPlaceholderConfig(url: string | undefined, anonKey: string | undefined): boolean {
  if (!url || !anonKey) return true;
  return PLACEHOLDER_RE.test(url) || PLACEHOLDER_RE.test(anonKey);
}

function isPolicyBlock(error: PostgrestError | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  if (error.code === "42501") return true;
  if (msg.includes("row-level security")) return true;
  if (msg.includes("permission denied")) return true;
  return false;
}

function assertPolicyBlock(label: string, error: PostgrestError | null): void {
  if (!isPolicyBlock(error)) {
    const detail = error ? `${error.code ?? "?"}: ${error.message}` : "no error returned";
    throw new Error(`${label}: expected RLS/permission block, got ${detail}`);
  }
}

async function signInTestUser(
  authed: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await authed.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`RLS test user sign-in failed: ${error.message}`);
  }
  const { data: session } = await authed.auth.getSession();
  if (!session.session) {
    throw new Error("RLS test user sign-in succeeded but session is missing");
  }
}

const TESTS: TestCase[] = [
  {
    name: "user_xp INSERT with anon key → blocked",
    async run({ anon }) {
      const { error } = await anon.from("user_xp").insert({
        user_id: RANDOM_USER_ID,
        total_xp: 999999,
      });
      assertPolicyBlock("user_xp INSERT", error);
    },
  },
  {
    name: "user_xp UPDATE with anon key → blocked",
    async run({ anon }) {
      const { error } = await anon
        .from("user_xp")
        .update({ total_xp: 999999 })
        .eq("user_id", RANDOM_USER_ID);
      assertPolicyBlock("user_xp UPDATE", error);
    },
  },
  {
    name: "verified_first_attempts INSERT with anon key → blocked",
    async run({ anon }) {
      const { error } = await anon.from("verified_first_attempts").insert({
        user_id: RANDOM_USER_ID,
        skill_node_id: RANDOM_NODE_ID,
        item_id: RANDOM_ITEM_ID,
        is_correct: true,
      });
      assertPolicyBlock("verified_first_attempts INSERT", error);
    },
  },
  {
    name: "item_bank INSERT with authenticated key → blocked",
    async run({ authed }) {
      const { error } = await authed.from("item_bank").insert({
        skill_node_id: RANDOM_NODE_ID,
        prompt: "RLS probe — should not persist",
        correct_answer: "A",
        explanation: "RLS probe",
        status: "pending_review",
      });
      assertPolicyBlock("item_bank INSERT", error);
    },
  },
  {
    name: "item_bank SELECT pending_review with anon → 0 rows",
    async run({ anon }) {
      const { data, error } = await anon
        .from("item_bank")
        .select("id")
        .eq("status", "pending_review")
        .limit(5);

      if (error) {
        throw new Error(`unexpected SELECT error: ${error.message}`);
      }
      if ((data?.length ?? 0) > 0) {
        throw new Error(`expected 0 pending_review rows for anon, got ${data?.length}`);
      }
    },
  },
  {
    name: "student_node_rolling_stats UPDATE with anon key → blocked",
    async run({ anon }) {
      const { error } = await anon
        .from("student_node_rolling_stats")
        .update({ rolling_accuracy: 99 })
        .eq("user_id", RANDOM_USER_ID)
        .eq("skill_node_id", RANDOM_NODE_ID);
      assertPolicyBlock("student_node_rolling_stats UPDATE", error);
    },
  },
];

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const testEmail = process.env.RLS_TEST_USER_EMAIL;
  const testPassword = process.env.RLS_TEST_USER_PASSWORD;

  if (isPlaceholderConfig(url, anonKey)) {
    console.log("RLS policy tests: skipped (placeholder or missing Supabase URL/anon key).");
    process.exit(0);
  }

  if (!testEmail || !testPassword) {
    console.error(
      "RLS policy tests: RLS_TEST_USER_EMAIL and RLS_TEST_USER_PASSWORD are required.",
    );
    process.exit(1);
  }

  const anon = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authed = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && !PLACEHOLDER_RE.test(serviceKey)) {
    const admin = createClient(url!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.from("divisions").select("id").limit(1);
    if (error) {
      console.error(`RLS policy tests: Supabase connectivity failed: ${error.message}`);
      process.exit(1);
    }
  }

  await signInTestUser(authed, testEmail, testPassword);

  const ctx: TestContext = { anon, authed };
  const failures: string[] = [];

  for (const test of TESTS) {
    try {
      await test.run(ctx);
      console.log(`  pass ${test.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  FAIL ${test.name}: ${msg}`);
      failures.push(`${test.name}: ${msg}`);
    }
  }

  await authed.auth.signOut();

  if (failures.length > 0) {
    console.error(`\nRLS policy tests failed (${failures.length}/${TESTS.length}).`);
    process.exit(1);
  }

  console.log(`\nRLS policy tests passed (${TESTS.length}/${TESTS.length}).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
