#!/usr/bin/env node
/** Rewrite @/features/studio-ai/auto-pilot imports to split modules. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(path.dirname(__dirname), "src");

const SYMBOL_MODULE = {
  TutorSessionWithPackage: "studio-packages",
  getTutorSessionsWithPackages: "studio-packages",
  buildSessionPackageRichContext: "studio-packages",
  generateSessionPackage: "studio-packages",
  persistStudioDraftFromNormalized: "studio-packages",
  saveStudioPackageDraft: "studio-packages",
  publishStudioPackage: "studio-packages",
  deleteStudioPackage: "studio-packages",
  getSessionPackage: "studio-packages",
  autoGenerateStudioPackagesForCompletedSessions: "studio-packages",
  processPendingRecordingTranscriptionJobs: "transcription-jobs",
  enqueueRecordingTranscriptionJobsForSessions: "transcription-jobs",
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
  /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/studio-ai\/auto-pilot["'];?/g;

let changed = 0;

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes("@/features/studio-ai/auto-pilot")) continue;

  const newText = text.replace(importRe, (full, typeKw, inner) => {
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
        console.warn(`Unknown studio symbol in ${file}: ${name}`);
        continue;
      }
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(spec);
    }

    const lines = [];
    for (const [mod, syms] of byModule) {
      const allType = syms.every((s) => s.startsWith("type "));
      const prefix = typeKw || allType ? "import type" : "import";
      lines.push(`${prefix} { ${syms.join(", ")} } from "@/features/studio-ai/${mod}";`);
    }
    return lines.join("\n");
  });

  if (newText !== text) {
    fs.writeFileSync(file, newText);
    changed++;
  }
}

console.log(`Updated studio imports in ${changed} files`);
