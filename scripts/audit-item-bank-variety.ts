#!/usr/bin/env npx tsx
/** Quick audit: approved item stems and UV/product repetition. */
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

function stemKey(prompt: string): string {
  return prompt
    .replace(/Skill proof · [^:]+:\s*/i, "")
    .replace(/Method pipeline · [^:]+:\s*/i, "")
    .replace(/Cloze construction · [^:]+:\s*/i, "")
    .replace(/Feature decision · [^:]+:\s*/i, "")
    .replace(/Sketch proof · [^:]+:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90)
    .toLowerCase();
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { count } = await sb
    .from("item_bank")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  const { data: rows } = await sb
    .from("item_bank")
    .select("prompt, item_format, answer_expression, authoring_meta, skill_node_id")
    .eq("status", "approved")
    .limit(5000);

  const stems = new Map<string, number>();
  const keys = new Map<string, number>();
  let uv = 0;
  for (const row of rows ?? []) {
    const s = stemKey(String(row.prompt ?? ""));
    stems.set(s, (stems.get(s) ?? 0) + 1);
    const meta = row.authoring_meta as { template_key?: string } | null;
    const k = meta?.template_key ?? "(none)";
    keys.set(k, (keys.get(k) ?? 0) + 1);
    if (/\$uv\$|product \$uv\$|u'v \+ uv'/i.test(String(row.prompt ?? ""))) uv += 1;
  }

  const topStems = [...stems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const topKeys = [...keys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(
    JSON.stringify(
      {
        approvedApprox: count,
        rowsLoaded: rows?.length ?? 0,
        uniqueStems: stems.size,
        uvProductMentions: uv,
        topRepeatedStems: topStems,
        topTemplateKeys: topKeys,
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
