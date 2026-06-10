#!/usr/bin/env node
/** Move landing + marketing shell components into features/marketing/. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const MOVES = [
  ["components/landing", "features/marketing/landing"],
  ["components/marketing-shell-client.tsx", "features/marketing/marketing-shell-client.tsx"],
  ["components/marketing-landing-nav.tsx", "features/marketing/marketing-landing-nav.tsx"],
  ["components/home-page-client.tsx", "features/marketing/home-page-client.tsx"],
  ["components/landing-story-bridge.tsx", "features/marketing/landing-story-bridge.tsx"],
  ["components/social-proof-strip.tsx", "features/marketing/social-proof-strip.tsx"],
  ["components/brand-typewriter.tsx", "features/marketing/ui/brand-typewriter.tsx"],
  ["components/marketing-scroll-sequence-dynamic.tsx", "features/marketing/marketing-scroll-sequence-dynamic.tsx"],
  ["components/scroll-sequence-wrapper.tsx", "features/marketing/scroll-sequence-wrapper.tsx"],
  ["components/ScrollSequence.tsx", "features/marketing/scroll-sequence.tsx"],
  ["components/first-sequence-hero-content.tsx", "features/marketing/scroll/first-sequence-hero-content.tsx"],
  ["components/second-sequence-outcome-content.tsx", "features/marketing/scroll/second-sequence-outcome-content.tsx"],
  ["components/third-sequence-why-content.tsx", "features/marketing/scroll/third-sequence-why-content.tsx"],
  ["components/third-static-features-content.tsx", "features/marketing/scroll/third-static-features-content.tsx"],
  ["components/fourth-static-flow-content.tsx", "features/marketing/scroll/fourth-static-flow-content.tsx"],
  ["components/fourth-static-sides-carousel-content.tsx", "features/marketing/scroll/fourth-static-sides-carousel-content.tsx"],
];

const IMPORT_REWRITES = [
  ["@/components/landing/", "@/features/marketing/landing/"],
  ["@/components/marketing-shell-client", "@/features/marketing/marketing-shell-client"],
  ["@/components/marketing-landing-nav", "@/features/marketing/marketing-landing-nav"],
  ["@/components/home-page-client", "@/features/marketing/home-page-client"],
  ["@/components/landing-story-bridge", "@/features/marketing/landing-story-bridge"],
  ["@/components/social-proof-strip", "@/features/marketing/social-proof-strip"],
  ["@/components/brand-typewriter", "@/features/marketing/ui/brand-typewriter"],
  ["@/components/marketing-scroll-sequence-dynamic", "@/features/marketing/marketing-scroll-sequence-dynamic"],
  ["@/components/scroll-sequence-wrapper", "@/features/marketing/scroll-sequence-wrapper"],
  ["@/components/ScrollSequence", "@/features/marketing/scroll-sequence"],
];

function movePath(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) {
    console.warn("SKIP missing:", fromRel);
    return;
  }
  if (fs.existsSync(to)) {
    console.warn("SKIP exists:", toRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  console.log("MOVED:", fromRel, "→", toRel);
}

function moveDir(fromRel, toRel) {
  const from = path.join(SRC, fromRel);
  const to = path.join(SRC, toRel);
  if (!fs.existsSync(from)) return;
  if (fs.existsSync(to)) {
    console.warn("SKIP dir exists:", toRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  console.log("MOVED DIR:", fromRel, "→", toRel);
}

for (const [from, to] of MOVES) {
  const fromPath = path.join(SRC, from);
  if (!fs.existsSync(fromPath)) continue;
  if (fs.statSync(fromPath).isDirectory()) moveDir(from, to);
  else movePath(from, to);
}

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, cb);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) cb(p);
  }
}

const sorted = [...IMPORT_REWRITES].sort((a, b) => b[0].length - a[0].length);
let n = 0;
for (const root of [SRC, path.join(ROOT, "tests"), path.join(ROOT, "e2e")]) {
  if (!fs.existsSync(root)) continue;
  walk(root, (file) => {
    const raw = fs.readFileSync(file, "utf8");
    let out = raw;
    for (const [oldP, newP] of sorted) out = out.split(oldP).join(newP);
    if (out !== raw) {
      fs.writeFileSync(file, out);
      n++;
    }
  });
}
console.log("Import rewrites:", n, "files");
