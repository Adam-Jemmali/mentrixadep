#!/usr/bin/env node
/** Move "use client" back to line 1 when import fix prepended modules. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !["node_modules", ".next"].includes(ent.name)) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const file of walk(path.join(ROOT, "src"))) {
  const content = fs.readFileSync(file, "utf8");
  const m = content.match(/^((?:import[^\n]+\n)+)("use client";)/);
  if (!m) continue;
  const rest = content.slice(m[0].length);
  const next = `"use client";\n\n${m[1]}${rest}`;
  fs.writeFileSync(file, next);
  console.log("fixed", path.relative(ROOT, file));
  fixed++;
}
console.log(`\n${fixed} files fixed`);
