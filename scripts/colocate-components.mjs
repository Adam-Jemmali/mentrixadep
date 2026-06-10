#!/usr/bin/env node
/** Move domain components into feature folders and rewrite imports. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const MOVES = [
  ["components/contact", "features/marketing/contact-ui"],
  ["components/duel", "features/duels/ui"],
  ["components/clan", "features/clans/ui"],
  ["components/resolve", "features/resolve/ui"],
  ["components/quest", "features/quest/ui"],
  ["components/learning", "features/learning-path/ui"],
  ["components/video", "features/video/ui"],
  ["components/auth", "features/auth/ui"],
  ["components/security", "features/auth/ui/security"],
  ["components/tutor", "features/tutor/ui"],
  ["components/student", "features/student-profile/ui"],
  ["components/pre-session-brief-card.tsx", "features/pre-session-brief/brief-card.tsx"],
  ["components/book-session-button-public.tsx", "features/booking/book-session-button-public.tsx"],
  ["components/booking-price-breakdown.tsx", "features/booking/booking-price-breakdown.tsx"],
  ["components/join-video-call-button.tsx", "features/video/join-video-call-button.tsx"],
  ["components/video-call.tsx", "features/video/video-call.tsx"],
  ["components/waitlist-join-form.tsx", "features/registration/waitlist-join-form.tsx"],
  ["components/top-rival-card.tsx", "features/divisions/top-rival-card.tsx"],
  ["components/xp-counter.tsx", "features/xp/xp-counter.tsx"],
  ["components/floating-xp-animations.tsx", "features/xp/floating-xp-animations.tsx"],
  ["components/feedback-widget.tsx", "features/marketing/feedback-widget.tsx"],
];

const IMPORT_REWRITES = [
  ["@/components/contact/", "@/features/marketing/contact-ui/"],
  ["@/components/duel/", "@/features/duels/ui/"],
  ["@/components/clan/", "@/features/clans/ui/"],
  ["@/components/resolve/", "@/features/resolve/ui/"],
  ["@/components/resolve", "@/features/resolve/ui"],
  ["@/components/quest/", "@/features/quest/ui/"],
  ["@/components/learning/", "@/features/learning-path/ui/"],
  ["@/components/video/", "@/features/video/ui/"],
  ["@/components/auth/", "@/features/auth/ui/"],
  ["@/components/security/", "@/features/auth/ui/security/"],
  ["@/components/tutor/", "@/features/tutor/ui/"],
  ["@/components/student/", "@/features/student-profile/ui/"],
  ["@/components/pre-session-brief-card", "@/features/pre-session-brief/brief-card"],
  ["@/components/book-session-button-public", "@/features/booking/book-session-button-public"],
  ["@/components/booking-price-breakdown", "@/features/booking/booking-price-breakdown"],
  ["@/components/join-video-call-button", "@/features/video/join-video-call-button"],
  ["@/components/video-call", "@/features/video/video-call"],
  ["@/components/waitlist-join-form", "@/features/registration/waitlist-join-form"],
  ["@/components/top-rival-card", "@/features/divisions/top-rival-card"],
  ["@/components/xp-counter", "@/features/xp/xp-counter"],
  ["@/components/floating-xp-animations", "@/features/xp/floating-xp-animations"],
  ["@/components/feedback-widget", "@/features/marketing/feedback-widget"],
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
