#!/usr/bin/env node
/**
 * Premium UI import gate — blocks sloppy animation library imports outside barrels.
 * Usage: node scripts/validate-ui-imports.mjs [--strict]
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const strict = process.argv.includes("--strict");

const SCAN_ROOTS = [
  resolve(root, "src/components"),
  resolve(root, "src/shared/ui"),
  resolve(root, "src/features"),
];

const BARREL_ALLOW = [
  "src/shared/animation/anime.ts",
  "src/shared/animation/motion.ts",
  "src/shared/animation/lenis-provider.tsx",
  "src/shared/core/gsap.ts",
  "src/shared/core/gsap-lazy.ts",
];

const BANNED_IMPORTS = [
  { pattern: /from\s+["']animejs["']/g, use: "@/shared/animation/anime" },
  { pattern: /from\s+["']motion\/react["']/g, use: "@/shared/animation/motion" },
  { pattern: /from\s+["']framer-motion["']/g, use: "@/shared/animation/motion" },
  { pattern: /from\s+["']react-spring["']/g, use: "@/shared/animation/motion" },
  { pattern: /from\s+["']@react-spring\/web["']/g, use: "@/shared/animation/motion" },
  { pattern: /from\s+["']lottie-react["']/g, use: "anime.js or GSAP timeline" },
  { pattern: /from\s+["']aos["']/g, use: "GSAP ScrollTrigger or anime.js" },
  { pattern: /from\s+["']@motionone\/dom["']/g, use: "@/shared/animation/motion" },
];

const LEGACY_WARN_ONLY = new Set([
  "src/features/mastery-grid/quest-pack-complete-letter.tsx",
  "src/features/marketing",
]);

let failures = 0;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

function isLegacy(rel) {
  for (const prefix of LEGACY_WARN_ONLY) {
    if (rel.startsWith(prefix)) return true;
  }
  return false;
}

function validateBarrels() {
  const required = [
    "src/shared/animation/anime.ts",
    "src/shared/animation/motion.ts",
    "src/shared/animation/lenis-provider.tsx",
    "src/shared/ui/bklit-shimmer.tsx",
    "src/shared/ui/kokonut-glass.tsx",
    "src/styles/tokens.css",
  ];
  for (const file of required) {
    if (!existsSync(resolve(root, file))) {
      failures += 1;
      console.error(`FAIL  missing premium UI file ${file}`);
    }
  }
  if (failures === 0) {
    console.log("PASS  premium UI barrels and primitives exist");
  }
}

function scanImports() {
  const violations = [];

  for (const scanRoot of SCAN_ROOTS) {
    for (const file of walk(scanRoot)) {
      if (extname(file) !== ".tsx" && extname(file) !== ".ts") continue;
      const rel = relative(root, file).replace(/\\/g, "/");
      if (BARREL_ALLOW.includes(rel)) continue;

      const content = readFileSync(file, "utf8");
      for (const ban of BANNED_IMPORTS) {
        ban.pattern.lastIndex = 0;
        if (ban.pattern.test(content)) {
          violations.push({ rel, use: ban.use });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log("PASS  no banned animation imports in scanned UI paths");
    return;
  }

  for (const v of violations) {
    const msg = `${v.rel} → use ${v.use}`;
    if (strict && !isLegacy(v.rel)) {
      failures += 1;
      console.error(`FAIL  banned import — ${msg}`);
    } else {
      console.warn(`WARN  banned import — ${msg}`);
    }
  }
}

validateBarrels();
scanImports();

if (failures > 0) {
  process.exit(1);
}

console.log("\nPremium UI import policy OK.");
