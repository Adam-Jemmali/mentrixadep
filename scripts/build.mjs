import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";
import { applyLocalEnvOverrides } from "./load-local-env.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const isWindows = process.platform === "win32";
const forceTurbo = process.argv.includes("--turbo") || process.argv.includes("--turbopack");
const forceWebpack = process.argv.includes("--webpack");

let useWebpack;
if (forceWebpack) useWebpack = true;
else if (forceTurbo) useWebpack = false;
else useWebpack = true; // Temporary: force Webpack everywhere due to Turbopack canary bugs

applyLocalEnvOverrides(root);

const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const args = ["build", ...(useWebpack ? ["--webpack"] : [])];

if (useWebpack && !forceWebpack) {
  console.log(
    "[build] Using webpack by default (avoids Turbopack canary compile bugs). Use `npm run build -- --turbo` to force Turbopack.\n",
  );
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));