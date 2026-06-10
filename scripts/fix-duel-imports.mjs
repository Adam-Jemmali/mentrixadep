#!/usr/bin/env node
/** Rewrite @/features/duels/duel imports to split capability modules. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(path.dirname(__dirname), "src");

const SYMBOL_MODULE = {
  createSkillDuel: "duel-create",
  createClanSkillDuel: "duel-create",
  joinDuelQueue: "duel-queue",
  leaveDuelQueue: "duel-queue",
  pollDuelQueue: "duel-queue",
  getQueueMatchAcceptance: "duel-queue",
  acceptQueueMatch: "duel-queue",
  declineQueueMatch: "duel-queue",
  QueueMatchAcceptanceState: "duel-queue",
  activateSkillDuelSession: "duel-gameplay",
  acceptSkillDuel: "duel-gameplay",
  createAiDuelFromQueue: "duel-gameplay",
  declineSkillDuel: "duel-gameplay",
  withdrawPendingSkillDuel: "duel-gameplay",
  hideSkillDuelFromList: "duel-gameplay",
  submitSkillDuelQuestionAnswer: "duel-gameplay",
  submitSkillDuelAnswers: "duel-gameplay",
  DuelPublicRow: "duel-reads",
  DuelParticipantClan: "duel-reads",
  DuelMatchupPreview: "duel-reads",
  DuelHistorySummary: "duel-reads",
  getLearnerPreview: "duel-reads",
  getDuelMatchupPreview: "duel-reads",
  getDuelForUser: "duel-reads",
  listStudentDuels: "duel-reads",
  getDuelHistorySummary: "duel-reads",
};

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

const importRe =
  /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/duels\/duel["'];?/g;

let changed = 0;

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes("@/features/duels/duel")) continue;

  const newText = text.replace(importRe, (full, typeKw, inner) => {
    const isTypeOnly = Boolean(typeKw);
    const specs = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const byModule = new Map();
    for (const spec of specs) {
      const m = spec.match(/^(type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m) {
        console.warn(`Unparsed import in ${file}: ${spec}`);
        continue;
      }
      const name = m[3] ?? m[2];
      const mod = SYMBOL_MODULE[name];
      if (!mod) {
        console.warn(`Unknown duel symbol in ${file}: ${name}`);
        continue;
      }
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(spec);
    }

    const lines = [];
    for (const [mod, syms] of byModule) {
      const prefix = isTypeOnly && syms.every((s) => s.startsWith("type ")) ? "import type" : "import";
      lines.push(`${prefix} { ${syms.join(", ")} } from "@/features/duels/${mod}";`);
    }
    return lines.join("\n");
  });

  if (newText !== text) {
    fs.writeFileSync(file, newText);
    changed++;
  }
}

console.log(`Updated duel imports in ${changed} files`);
