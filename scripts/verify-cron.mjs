import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_VERCEL_PATHS = [
  "/api/cron/complete-sessions",
  "/api/cron/process-payouts",
];

/** Scheduled in .github/workflows/cron-background-jobs.yml (every 15 min), not vercel.json. */
const GITHUB_SCHEDULED_PATHS = [
  "/api/cron/process-background-jobs",
  "/api/cron/refresh-rank-cache",
];

function loadVercelConfig() {
  const filePath = resolve(process.cwd(), "vercel.json");
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function findMissingCronPaths(config) {
  const crons = Array.isArray(config?.crons) ? config.crons : [];
  const configured = new Set(crons.map((c) => String(c.path || "").trim()));
  return REQUIRED_VERCEL_PATHS.filter((p) => !configured.has(p));
}

async function pingCron(baseUrl, path, secret) {
  const url = new URL(path, baseUrl).toString();
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {
    bodyText = "";
  }

  let bodyJson = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  return {
    path,
    url,
    ok: res.ok,
    status: res.status,
    bodyText,
    bodyJson,
  };
}

async function main() {
  const config = loadVercelConfig();
  const missing = findMissingCronPaths(config);

  if (missing.length > 0) {
    console.error("Missing required cron paths in vercel.json:");
    for (const p of missing) console.error(` - ${p}`);
    process.exit(1);
  }

  console.log("Cron config check passed: required paths exist in vercel.json");

  const baseUrl = process.env.CRON_VERIFY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const secret = process.env.CRON_SECRET || "";

  if (!baseUrl || !secret) {
    console.log("Skipping live ping checks (set CRON_VERIFY_BASE_URL and CRON_SECRET to enable).");
    process.exit(0);
  }

  const results = [];
  const pingPaths = [...REQUIRED_VERCEL_PATHS, ...GITHUB_SCHEDULED_PATHS];
  for (const path of pingPaths) {
    results.push(await pingCron(baseUrl, path, secret));
  }

  let hasFailure = false;
  for (const r of results) {
    const statusLabel = r.ok ? "OK" : "FAIL";
    const jobStatus = typeof r.bodyJson?.status === "string" ? r.bodyJson.status : "unknown";
    console.log(`${statusLabel} ${r.path} -> HTTP ${r.status}, job status: ${jobStatus}`);

    if (!r.ok) {
      hasFailure = true;
      console.error(`  URL: ${r.url}`);
      console.error(`  Body: ${r.bodyText.slice(0, 400)}`);
      continue;
    }

    if (jobStatus !== "ok") {
      hasFailure = true;
      console.error(`  Unexpected job status for ${r.path}: ${jobStatus}`);
      console.error(`  Body: ${r.bodyText.slice(0, 400)}`);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }

  console.log("Live cron checks passed for both required jobs.");
}

main().catch((err) => {
  console.error("Cron verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
