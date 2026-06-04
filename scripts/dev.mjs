/**
 * Frees TCP port 3000 (stale `next dev` / other listeners), then runs `next dev -p 3000`.
 * Avoids "Port 3000 is in use, trying 3001" and keeps OAuth / app URL on a single port.
 *
 * - macOS/Linux: Turbopack (`--turbo`) by default.
 * - Windows: webpack by default (Turbopack disk persistence often fails with Access denied / os error 5).
 * - Override: `npm run dev -- --turbo` or `npm run dev -- --webpack` on any OS.
 */
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";
import { applyLocalEnvOverrides } from "./load-local-env.mjs";

const PORT = 3000;
// import.meta.url is .../scripts/dev.mjs — one dirname = scripts/, two = repo root
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const isWindows = process.platform === "win32";
const forceTurbo = process.argv.includes("--turbo");
const forceWebpack = process.argv.includes("--webpack");

let useWebpack;
if (forceWebpack) useWebpack = true;
else if (forceTurbo) useWebpack = false;
else useWebpack = isWindows;

applyLocalEnvOverrides(root);

function freePortWindows() {
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore" },
    );
  } catch {
    /* nothing listening or access denied */
  }
}

function freePortUnix() {
  try {
    execFileSync("sh", ["-c", `lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`], { stdio: "ignore" });
  } catch {
    /* nothing listening */
  }
}

if (process.platform === "win32") freePortWindows();
else freePortUnix();

const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const args = [
  "dev",
  "-p",
  String(PORT),
  ...(useWebpack ? ["--webpack"] : ["--turbo"]),
];

if (useWebpack && isWindows && !forceWebpack) {
  console.log(
    "[dev] Windows: using webpack (avoids Turbopack “Persisting failed / Access denied”). Use `npm run dev -- --turbo` to force Turbopack.\n",
  );
}

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
