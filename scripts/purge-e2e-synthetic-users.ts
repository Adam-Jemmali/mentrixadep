#!/usr/bin/env npx tsx
/**
 * Purge Playwright / GitHub Actions synthetic accounts from Auth + public tables.
 *
 * Matches emails like:
 *   e2e.guest-chain.1783482184461.8p3w5w@example.com
 *   e2e.chain.1783485371027@example.com
 * and public labels like e2e-chain-*.
 *
 * Usage:
 *   npx tsx scripts/purge-e2e-synthetic-users.ts --dry-run
 *   npx tsx scripts/purge-e2e-synthetic-users.ts --confirm
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isE2ESyntheticAccount,
  isE2ESyntheticEmail,
  isE2ESyntheticLabel,
} from "../src/shared/core/e2e-synthetic-account-pure";

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
      if (key && process.env[key] == null) process.env[key] = value;
    }
  }
}

loadEnv();

const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm");

if (!dryRun && !confirm) {
  console.error("Pass --dry-run or --confirm.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Hit = {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
};

async function listSyntheticAuthUsers(): Promise<Hit[]> {
  const hits: Hit[] = [];
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    for (const user of data.users) {
      const email = user.email?.trim().toLowerCase() ?? null;
      if (!isE2ESyntheticEmail(email)) continue;
      hits.push({
        id: user.id,
        email,
        displayName: null,
        username: null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return hits;
}

async function listSyntheticFromSettings(): Promise<Hit[]> {
  const { data, error } = await admin
    .from("user_settings")
    .select("user_id, display_name, rank_card_username");
  if (error) throw new Error(`user_settings read failed: ${error.message}`);

  const hits: Hit[] = [];
  for (const row of data ?? []) {
    const displayName = (row.display_name as string | null) ?? null;
    const username =
      typeof row.rank_card_username === "string" ? row.rank_card_username : null;
    if (!isE2ESyntheticAccount({ displayName, username })) continue;
    hits.push({
      id: String(row.user_id),
      email: null,
      displayName,
      username,
    });
  }
  return hits;
}

async function deleteLiveBoardForUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  let deleted = 0;
  for (const chunk of chunkIds(userIds, 50)) {
    const { data, error } = await admin
      .from("live_board_events")
      .delete()
      .in("user_id", chunk)
      .select("id");
    if (error) {
      console.error("live_board_events delete failed", error.message);
      continue;
    }
    deleted += data?.length ?? 0;
  }

  const { data: labelRows, error: labelError } = await admin
    .from("live_board_events")
    .select("id, display_name")
    .limit(500);
  if (!labelError) {
    const fakeIds = (labelRows ?? [])
      .filter((row) => isE2ESyntheticLabel(String(row.display_name ?? "")))
      .map((row) => String(row.id));
    for (const chunk of chunkIds(fakeIds, 50)) {
      const { data, error } = await admin
        .from("live_board_events")
        .delete()
        .in("id", chunk)
        .select("id");
      if (!error) deleted += data?.length ?? 0;
    }
  }

  return deleted;
}

async function deleteRankCacheForUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  let deleted = 0;
  for (const chunk of chunkIds(userIds, 50)) {
    const { data, error } = await admin
      .from("ap_calc_verified_rank_cache")
      .delete()
      .in("user_id", chunk)
      .select("user_id");
    if (error) {
      console.error("rank cache delete failed", error.message);
      continue;
    }
    deleted += data?.length ?? 0;
  }
  return deleted;
}

async function deleteAuthUser(userId: string): Promise<boolean> {
  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) {
    console.error(`auth delete failed for ${userId}: ${error.message}`);
    return false;
  }
  return true;
}

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const [fromAuth, fromSettings] = await Promise.all([
    listSyntheticAuthUsers(),
    listSyntheticFromSettings(),
  ]);

  const byId = new Map<string, Hit>();
  for (const hit of [...fromAuth, ...fromSettings]) {
    const existing = byId.get(hit.id);
    byId.set(hit.id, {
      id: hit.id,
      email: hit.email ?? existing?.email ?? null,
      displayName: hit.displayName ?? existing?.displayName ?? null,
      username: hit.username ?? existing?.username ?? null,
    });
  }

  const hits = [...byId.values()];
  console.log(`[purge-e2e] Found ${hits.length} synthetic account(s).`);
  for (const hit of hits.slice(0, 40)) {
    console.log(
      ` - ${hit.id} | ${hit.email ?? "(no email)"} | ${hit.displayName ?? "-"} | @${hit.username ?? "-"}`,
    );
  }
  if (hits.length > 40) console.log(` ... and ${hits.length - 40} more`);

  if (dryRun) {
    console.log("[purge-e2e] Dry run only. Re-run with --confirm to delete.");
    return;
  }

  const userIds = hits.map((hit) => hit.id);
  const boardDeleted = await deleteLiveBoardForUsers(userIds);
  const cacheDeleted = await deleteRankCacheForUsers(userIds);
  console.log(`[purge-e2e] Removed ${boardDeleted} live board row(s), ${cacheDeleted} rank cache row(s).`);

  let deletedUsers = 0;
  for (const userId of userIds) {
    if (await deleteAuthUser(userId)) deletedUsers += 1;
  }
  console.log(`[purge-e2e] Deleted ${deletedUsers}/${userIds.length} auth user(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
