import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function applyLocalEnvOverrides(rootDir) {
  // Vercel production injects env vars; skip .env.local there only.
  // `vercel dev` also sets VERCEL=1 but still needs .env.local for local secrets.
  if (process.env.NODE_ENV === "production") return;

  const envPath = join(rootDir, ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) {
      process.env[key] = value;
    }
  }
}