#!/usr/bin/env node
/**
 * Mentrixa token foundation gate.
 * Usage: node scripts/validate-tokens.mjs [--strict]
 *
 * Default: verify tokens.css structure + globals.css import order.
 * --strict: also fail on hardcoded hex in src/components and src/features.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const strict = process.argv.includes("--strict");

const REQUIRED_TOKENS = [
  "--color-violet-600",
  "--color-gold-500",
  "--color-navy-900",
  "--mx-primary",
  "--mx-verified",
  "--mx-surface",
  "--mx-node-verified",
  "--btn-primary-bg",
  "--card-bg",
  "--verdict-accent",
];

const BRAND_HEXES = new Set([
  "7c3aed",
  "6d28d9",
  "8b5cf6",
  "a78bfa",
  "d4a017",
  "f59e0b",
  "b7860e",
  "0b1220",
  "0f172a",
  "1e293b",
  "6366f1",
  "374151",
  "92400e",
  "1d4ed8",
  "15803d",
  "22d3ee",
  "4b5563",
  "9ca3af",
  "e2e8f0",
]);

const EXCLUDED_FILES = new Set([
  "src/styles/tokens.css",
  "src/app/globals.css",
  "tailwind.config.ts",
]);

const HEX_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function pass(message) {
  console.log(`PASS  ${message}`);
}

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

function validateTokenFile() {
  const tokenPath = resolve(root, "src/styles/tokens.css");
  if (!existsSync(tokenPath)) {
    fail("src/styles/tokens.css is missing");
    return;
  }

  const content = readFileSync(tokenPath, "utf8");
  for (const token of REQUIRED_TOKENS) {
    if (!content.includes(token)) {
      fail(`tokens.css missing required token ${token}`);
    }
  }

  if (content.includes("--mx-primary: var(--color-violet-600)") === false) {
    fail("tokens.css semantic layer must derive --mx-primary from primitives");
  }

  pass("tokens.css contains required three-layer tokens");
}

function validateGlobalsImport() {
  const globalsPath = resolve(root, "src/app/globals.css");
  if (!existsSync(globalsPath)) {
    fail("src/app/globals.css is missing");
    return;
  }

  const content = readFileSync(globalsPath, "utf8");
  const trimmed = content.replace(/^\uFEFF/, "").trimStart();
  if (!trimmed.startsWith('@import "../styles/tokens.css"')) {
    fail('globals.css must import "../styles/tokens.css" before all other rules');
    return;
  }

  pass("globals.css imports tokens.css first");
}

function scanHardcodedHex() {
  const scanRoots = [
    resolve(root, "src/components"),
    resolve(root, "src/features"),
  ];

  const violations = [];

  for (const scanRoot of scanRoots) {
    for (const file of walk(scanRoot)) {
      const rel = relative(root, file).replace(/\\/g, "/");
      if (!/\.(tsx|css)$/.test(file)) continue;
      if (EXCLUDED_FILES.has(rel)) continue;

      const content = readFileSync(file, "utf8");
      const matches = content.match(HEX_PATTERN) ?? [];
      for (const match of matches) {
        const normalized = match.slice(1).toLowerCase();
        const hex =
          normalized.length === 3
            ? normalized
                .split("")
                .map((c) => c + c)
                .join("")
            : normalized;
        if (BRAND_HEXES.has(hex)) {
          violations.push({ rel, match });
        }
      }
    }
  }

  if (violations.length === 0) {
    pass("no hardcoded brand hex in src/components or src/features");
    return;
  }

  const grouped = new Map();
  for (const v of violations) {
    if (!grouped.has(v.rel)) grouped.set(v.rel, new Set());
    grouped.get(v.rel).add(v.match);
  }

  for (const [rel, hexes] of grouped) {
    const msg = `${rel}: ${[...hexes].join(", ")}`;
    if (strict) fail(`hardcoded brand hex — ${msg}`);
    else console.warn(`WARN  hardcoded brand hex — ${msg}`);
  }

  if (!strict) {
    console.log(`      ${violations.length} brand hex literal(s) found (use --strict to fail)`);
  }
}

validateTokenFile();
validateGlobalsImport();
scanHardcodedHex();

if (failures > 0) {
  process.exit(1);
}

console.log("\nToken foundation OK.");
