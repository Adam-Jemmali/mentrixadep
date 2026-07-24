#!/usr/bin/env node
/**
 * Mechanical brand hex → CSS var migration for validate:tokens:strict.
 * Usage: node scripts/migrate-brand-hex.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const EXCLUDED = new Set([
  "src/styles/tokens.css",
  "src/app/globals.css",
  "tailwind.config.ts",
]);

const REPLACEMENTS = [
  [/var\((--(?:mx|color)-[a-z0-9-]+),#[0-9a-fA-F]{3,8}\)/g, "var($1)"],
  [/text-\[#7C3AED\]/gi, "text-[var(--mx-violet)]"],
  [/text-\[#6D28D9\]/gi, "text-[var(--mx-primary-hover)]"],
  [/text-\[#6366F1\]/gi, "text-[var(--mx-indigo)]"],
  [/text-\[#0B1220\]/gi, "text-[var(--mx-navy)]"],
  [/text-\[#0F172A\]/gi, "text-[var(--mx-navy-2)]"],
  [/text-\[#1[Ee]293[Bb]\]/g, "text-[var(--mx-surface-3)]"],
  [/text-\[#9CA3AF\]/gi, "text-[var(--mx-muted)]"],
  [/text-\[#4[Bb]5563\]/g, "text-[var(--mx-steel)]"],
  [/text-\[#D4A017\]/gi, "text-[var(--mx-gold)]"],
  [/text-\[#E2E8F0\]/gi, "text-[var(--mx-rule)]"],
  [/text-\[#A78BFA\]/gi, "text-[var(--color-violet-400)]"],
  [/bg-\[#0[Bb]1220\]/gi, "bg-[var(--mx-navy)]"],
  [/bg-\[#0[Ff]172[Aa]\]/gi, "bg-[var(--mx-navy-2)]"],
  [/bg-\[#7C3AED\]/gi, "bg-[var(--mx-violet)]"],
  [/bg-\[#6[Dd]28[Dd]9\]/gi, "bg-[var(--mx-primary-hover)]"],
  [/bg-\[#6366F1\]/gi, "bg-[var(--mx-indigo)]"],
  [/bg-\[#EDE9FE\]/gi, "bg-violet-100"],
  [/border-\[#7C3AED\]/gi, "border-[var(--mx-violet)]"],
  [/border-\[#6366F1\]/gi, "border-[var(--mx-indigo)]"],
  [/border-\[#6[Dd]28[Dd]9\]/gi, "border-[var(--mx-primary-hover)]"],
  [/border-\[#E0E7FF\]/gi, "border-violet-200"],
  [/border-\[#C4B5FD\]/gi, "border-violet-300"],
  [/border-\[#A5B4FC\]/gi, "border-violet-300"],
  [/border-\[#D4A017\]/gi, "border-[var(--mx-gold)]"],
  [/ring-\[#6366F1\]/gi, "ring-[var(--mx-indigo)]"],
  [/ring-\[#D4A017\]/gi, "ring-[var(--mx-gold)]"],
  [/hover:bg-\[#6[Dd]28[Dd]9\]/gi, "hover:bg-[var(--mx-primary-hover)]"],
  [/hover:text-\[#6[Dd]28[Dd]9\]/gi, "hover:text-[var(--mx-primary-hover)]"],
  [/hover:border-\[#6366F1\]/gi, "hover:border-[var(--mx-indigo)]"],
  [/hover:border-\[#7C3AED\]/gi, "hover:border-[var(--mx-violet)]"],
  [/from-\[#7C3AED\]/gi, "from-[var(--mx-violet)]"],
  [/via-\[#6366F1\]/gi, "via-[var(--mx-indigo)]"],
  [/to-\[#6366F1\]/gi, "to-[var(--mx-indigo)]"],
  [/stroke="#7C3AED"/gi, 'stroke="var(--mx-violet)"'],
  [/stroke="#6366F1"/gi, 'stroke="var(--mx-indigo)"'],
  [/stroke="#D4A017"/gi, 'stroke="var(--mx-gold)"'],
  [/fill="#D4A017"/gi, 'fill="var(--mx-gold)"'],
  [/fill="#7C3AED"/gi, 'fill="var(--mx-violet)"'],
  [/fill="#6366F1"/gi, 'fill="var(--mx-indigo)"'],
  [/"#7C3AED"/gi, '"var(--mx-violet)"'],
  [/"#6[Dd]28[Dd]9"/g, '"var(--mx-primary-hover)"'],
  [/"#6366F1"/gi, '"var(--mx-indigo)"'],
  [/"#0[Bb]1220"/g, '"var(--mx-navy)"'],
  [/"#0[Ff]172[Aa]"/g, '"var(--mx-navy-2)"'],
  [/"#1[Ee]293[Bb]"/g, '"var(--mx-surface-3)"'],
  [/"#9CA3AF"/gi, '"var(--mx-muted)"'],
  [/"#E2E8F0"/gi, '"var(--mx-rule)"'],
  [/"#4[Bb]5563"/g, '"var(--mx-steel)"'],
  [/"#22[Dd]3[Ee][Ee]"/g, '"var(--mx-cyan)"'],
  [/"#8[Bb]5[Cc][Ff]6"/g, '"var(--color-violet-500)"'],
  [/"#A78BFA"/gi, '"var(--color-violet-400)"'],
  [/style=\{\{\s*color:\s*"#7C3AED"/g, 'style={{ color: "var(--mx-violet)"'],
  [/style=\{\{\s*color:\s*"#D4A017"/g, 'style={{ color: "var(--mx-gold)"'],
  [/borderLeft:\s*"3px solid #D4A017"/g, 'borderLeft: "3px solid var(--mx-gold)"'],
  [/borderLeft:\s*"4px solid #7C3AED"/g, 'borderLeft: "4px solid var(--mx-violet)"'],
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

let changed = 0;
for (const scanRoot of ["src/components", "src/features"]) {
  for (const file of walk(resolve(root, scanRoot))) {
    const rel = relative(root, file).replace(/\\/g, "/");
    if (!/\.tsx$/.test(file)) continue;
    if (EXCLUDED.has(rel)) continue;

    const original = readFileSync(file, "utf8");
    let next = original;
    for (const [pattern, replacement] of REPLACEMENTS) {
      next = next.replace(pattern, replacement);
    }
    if (next !== original) {
      writeFileSync(file, next, "utf8");
      changed += 1;
      console.log(`updated ${rel}`);
    }
  }
}

console.log(`\nMigrated ${changed} file(s).`);
