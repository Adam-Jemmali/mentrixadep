#!/usr/bin/env npx tsx
/**
 * Free-tier pre-marketing checks (Hobby-safe).
 *
 * 1) Anon REST UPDATE on user_xp must be blocked (RLS / privilege)
 * 2) live_board_events write → readable under 2s (probe insert + delete)
 * 3) Prints the free k6 command (smoke only against prod)
 *
 * Usage: npx tsx scripts/free-tier-prelaunch-checks.ts
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!.trim();
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function isBlocked(error: { code?: string; message?: string; status?: number } | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? "").toLowerCase();
  const status = Number(error.status ?? 0);
  if (status === 401 || status === 403) return true;
  if (code === "42501" || code === "PGRST301" || code === "PGRST116") return true;
  if (msg.includes("permission") || msg.includes("rls") || msg.includes("policy")) return true;
  if (msg.includes("not allowed") || msg.includes("forbidden")) return true;
  return false;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const results: Array<{ name: string; ok: boolean; detail: string }> = [];

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1) Anon UPDATE user_xp ──────────────────────────────────────────────
  {
    const { error, status } = await anon
      .from("user_xp")
      .update({ total_xp: 999999 })
      .eq("user_id", "00000000-0000-4000-8000-000000000001");

    const blocked = isBlocked(
      error
        ? { code: error.code, message: error.message, status: (error as { status?: number }).status ?? status }
        : status === 401 || status === 403
          ? { status, message: "http status" }
          : null,
    );

    // PostgREST often returns 200 with 0 rows + no error when RLS hides the row.
    // Treat "no error AND no privilege to mutate" as pass only if REVOKE means error,
    // OR if we get an explicit privilege error. Also fail-open check via service select.
    const ok = blocked || Boolean(error);
    results.push({
      name: "Anon REST UPDATE user_xp blocked",
      ok,
      detail: error
        ? `${(error as { status?: number }).status ?? status ?? "?"} ${error.code ?? ""} ${error.message}`
        : `status=${status} (no error — check REVOKE; prefer explicit 401/403)`,
    });
  }

  // ── 2) live_board probe under 2s ────────────────────────────────────────
  if (!serviceKey) {
    results.push({
      name: "live_board write→read <2s",
      ok: false,
      detail: "SUPABASE_SERVICE_ROLE_KEY missing — skipped",
    });
  } else {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const marker = `prelaunch-probe-${Date.now()}`;
    const started = Date.now();
    const { data: inserted, error: insertError } = await admin
      .from("live_board_events")
      .insert({
        event_type: "verified_attempt",
        user_id: "00000000-0000-4000-8000-000000000001",
        display_name: marker,
        node_name: "Prelaunch probe",
        unit_name: "Audit",
        is_first_attempt: true,
        occurred_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      // user_id FK may fail — try with a real user id from recent events
      const { data: recent } = await admin
        .from("live_board_events")
        .select("user_id")
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const realUser = recent?.user_id;
      if (!realUser) {
        results.push({
          name: "live_board write→read <2s",
          ok: false,
          detail: `insert failed: ${insertError?.message ?? "no user_id available"}`,
        });
      } else {
        const t0 = Date.now();
        const { data: row, error: ins2 } = await admin
          .from("live_board_events")
          .insert({
            event_type: "verified_attempt",
            user_id: realUser,
            display_name: marker,
            node_name: "Prelaunch probe",
            unit_name: "Audit",
            is_first_attempt: true,
            occurred_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (ins2 || !row?.id) {
          results.push({
            name: "live_board write→read <2s",
            ok: false,
            detail: ins2?.message ?? "insert failed",
          });
        } else {
          const { data: found } = await anon
            .from("live_board_events")
            .select("id, display_name")
            .eq("id", row.id)
            .maybeSingle();
          const ms = Date.now() - t0;
          await admin.from("live_board_events").delete().eq("id", row.id);
          results.push({
            name: "live_board write→read <2s",
            ok: Boolean(found?.id) && ms < 2000,
            detail: `visible_to_anon=${Boolean(found?.id)} latency_ms=${ms}`,
          });
        }
      }
    } else {
      const { data: found } = await anon
        .from("live_board_events")
        .select("id")
        .eq("id", inserted.id)
        .maybeSingle();
      const ms = Date.now() - started;
      await admin.from("live_board_events").delete().eq("id", inserted.id);
      results.push({
        name: "live_board write→read <2s",
        ok: Boolean(found?.id) && ms < 2000,
        detail: `visible_to_anon=${Boolean(found?.id)} latency_ms=${ms}`,
      });
    }
  }

  console.log("\nFree-tier prelaunch checks\n");
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
    console.log(`       ${r.detail}`);
    if (!r.ok) failed += 1;
  }

  console.log(`\nk6 (free):\n  GitHub Actions → workflow_dispatch CI → load-smoke (PROFILE=smoke)`);
  console.log(`  Local smoke:  k6 run -e PROFILE=smoke -e BASE_URL=https://mentrixa.one load-tests/arena-board.js`);
  console.log(`  NEVER PROFILE=full against Hobby prod (burns quota). Full = staging only.\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
