#!/usr/bin/env npx tsx
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnv(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (k && process.env[k] === undefined) process.env[k] = v;
    }
    break;
  }
}

async function main() {
  loadEnv();
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { count: pending } = await sb
    .from("item_bank")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  const answers = new Set<string>();
  const stems = new Set<string>();
  let total = 0;
  let uv = 0;
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from("item_bank")
      .select("prompt, answer_expression, authoring_meta")
      .eq("status", "approved")
      .in("item_format", ["free_response", "drag_order", "complete_expression", "graph_feature"])
      .range(from, from + 999);
    if (!data?.length) break;
    total += data.length;
    for (const row of data) {
      if (row.answer_expression) answers.add(String(row.answer_expression));
      if (/\$uv\$/i.test(String(row.prompt ?? ""))) uv += 1;
      const stem = String(row.prompt ?? "")
        .replace(/Skill proof · [^:]+:\s*/i, "")
        .replace(/Method pipeline · [^:]+:\s*/i, "")
        .slice(0, 80)
        .toLowerCase();
      stems.add(stem);
    }
    if (data.length < 1000) break;
  }

  console.log(
    JSON.stringify(
      {
        pending,
        totalApprovedConstruction: total,
        uniqueAnswers: answers.size,
        uniqueStems: stems.size,
        uvProductMentions: uv,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
