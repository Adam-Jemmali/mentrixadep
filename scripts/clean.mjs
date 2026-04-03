/**
 * Remove `.next` reliably on Windows (ENOTEMPTY when files are briefly locked).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

if (!fs.existsSync(nextDir)) {
  console.log(".next not found — nothing to clean.");
  process.exit(0);
}

try {
  fs.rmSync(nextDir, {
    recursive: true,
    force: true,
    /** Windows: retry when antivirus / dev tools briefly lock files */
    maxRetries: 15,
    retryDelay: 150,
  });
  console.log("Removed .next");
} catch (err) {
  const code = /** @type {NodeJS.ErrnoException} */ (err).code;
  if (code === "ENOENT") process.exit(0);
  console.error("Failed to remove .next:", err instanceof Error ? err.message : err);
  console.error("Stop `npm run dev` / close apps using .next, then run npm run clean again.");
  process.exit(1);
}
