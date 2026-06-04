#!/usr/bin/env node

/**
 * Generate TypeScript types from the Supabase database schema.
 *
 * Usage:
 *   node scripts/generate-types.mjs
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - supabase CLI installed: npx supabase gen types typescript
 *
 * The generated types are written to src/lib/supabase-generated.types.ts.
 * The hand-maintained database.types.ts remains for app-level interfaces.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let envContent = "";
try {
  envContent = readFileSync(resolve(root, ".env"), "utf8");
} catch {
  try {
    envContent = readFileSync(resolve(root, ".env.local"), "utf8");
  } catch {
    console.error("No .env or .env.local found. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
}

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? process.env[name] ?? "";
}

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is required.");
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const outFile = resolve(root, "src/lib/supabase-generated.types.ts");

console.log(`Generating types for project: ${projectRef}`);
console.log(`Output: ${outFile}`);

try {
  execSync(
    `npx supabase gen types typescript --project-id "${projectRef}" > "${outFile}"`,
    { stdio: "inherit", cwd: root }
  );
  console.log("Types generated successfully.");
} catch (err) {
  console.error("Failed to generate types. Is supabase CLI available?");
  console.error("Install with: npm install -g supabase");
  process.exit(1);
}
