import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";
import { applyLocalEnvOverrides } from "./load-local-env.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

applyLocalEnvOverrides(root);

const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));