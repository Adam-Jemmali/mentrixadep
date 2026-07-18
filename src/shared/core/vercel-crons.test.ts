import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type VercelCron = {
  path: string;
  schedule: string;
};

type VercelConfig = {
  crons?: VercelCron[];
};

function readVercelConfig(): VercelConfig {
  const p = join(process.cwd(), "vercel.json");
  return JSON.parse(readFileSync(p, "utf8")) as VercelConfig;
}

/** Vercel Hobby rejects schedules that run more than once per day. */
function isHobbyCompatibleCronSchedule(schedule: string): boolean {
  const s = schedule.trim();
  if (!s) return false;
  if (/\*\/\d+/.test(s)) return false;
  const parts = s.split(/\s+/);
  if (parts.length < 5) return false;
  const minute = parts[0] ?? "";
  const hour = parts[1] ?? "";
  if (minute.includes(",") || hour.includes(",")) return false;
  if (minute === "*" || hour === "*") return false;
  return true;
}

function isDailyCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const dom = parts[2] ?? "";
  const dow = parts[4] ?? "";
  return dom === "*" && dow === "*";
}

function isWeeklyOrMonthlyCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const dom = parts[2] ?? "";
  const dow = parts[4] ?? "";
  if (dom !== "*" && dom !== "*/1") return true;
  return dow !== "*";
}

/** Batch/materialized crons run weekly (Monday UTC) — not hourly or daily. */
const WEEKLY_BATCH_CRON_PATHS = new Set([
  "/api/cron/refresh-division-leaderboard",
  "/api/cron/refresh-guide-impact",
  "/api/cron/reconcile-subscriptions",
  "/api/cron/sync-peer-comparison",
]);

function isWeeklyMondayCronSchedule(schedule: string): boolean {
  const parts = schedule.trim().split(/\s+/);
  return parts.length >= 5 && parts[4] === "1";
}

describe("vercel cron config", () => {
  it("uses Hobby-compatible schedules (at most once per day)", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    for (const cron of crons) {
      expect(
        isHobbyCompatibleCronSchedule(cron.schedule),
        `Cron ${cron.path} schedule "${cron.schedule}" runs more than once per day (Vercel Hobby deploy will fail)`,
      ).toBe(true);
    }
  });

  it("does not schedule any cron daily", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    for (const cron of crons) {
      expect(
        isDailyCronSchedule(cron.schedule),
        `Cron ${cron.path} schedule "${cron.schedule}" is daily; use weekly or monthly`,
      ).toBe(false);
    }
  });

  it("schedules every cron weekly or monthly", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    for (const cron of crons) {
      expect(
        isWeeklyOrMonthlyCronSchedule(cron.schedule),
        `Cron ${cron.path} schedule "${cron.schedule}" must be weekly or monthly`,
      ).toBe(true);
    }
  });

  it("schedules batch materialized crons weekly on Monday UTC", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    for (const path of WEEKLY_BATCH_CRON_PATHS) {
      const cron = crons.find((c) => c.path === path);
      expect(cron, `Missing cron for ${path}`).toBeTruthy();
      expect(
        isWeeklyMondayCronSchedule(cron!.schedule),
        `Expected weekly Monday schedule for ${path}, got "${cron!.schedule}"`,
      ).toBe(true);
    }
  });

  it("includes required payout pipeline crons", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];

    const requiredPaths = [
      "/api/cron/complete-sessions",
      "/api/cron/process-payouts",
    ];

    for (const requiredPath of requiredPaths) {
      const cron = crons.find((c) => c.path === requiredPath);
      expect(cron, `Missing cron for ${requiredPath}`).toBeTruthy();
      expect(cron?.schedule?.trim().length, `Missing schedule for ${requiredPath}`).toBeGreaterThan(0);
    }
  });

  it("does not schedule process-background-jobs on Vercel (GitHub Actions every 15 min)", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    const bgJob = crons.find((c) => c.path === "/api/cron/process-background-jobs");
    expect(bgJob, "process-background-jobs must run via GitHub Actions, not vercel.json").toBeUndefined();
  });

  it("does not schedule refresh-rank-cache on Vercel (GitHub Actions every 5 min)", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    const rankCache = crons.find((c) => c.path === "/api/cron/refresh-rank-cache");
    expect(rankCache, "refresh-rank-cache must run via GitHub Actions, not vercel.json").toBeUndefined();
  });

  it("does not schedule check-mastery-decay on Vercel (GitHub Actions daily)", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];
    const decay = crons.find((c) => c.path === "/api/cron/check-mastery-decay");
    expect(decay, "check-mastery-decay must run via GitHub Actions, not vercel.json").toBeUndefined();
  });

  it("schedules generate-wrapped once yearly on Dec 15 UTC", () => {
    const cfg = readVercelConfig();
    const cron = (cfg.crons ?? []).find((c) => c.path === "/api/cron/generate-wrapped");
    expect(cron).toBeTruthy();
    expect(cron!.schedule).toBe("0 0 15 12 *");
  });
});

describe("github background job cron", () => {
  it("runs process-background-jobs every 15 minutes via shared ping script", () => {
    const workflowPath = join(process.cwd(), ".github/workflows/cron-background-jobs.yml");
    const pingScript = join(process.cwd(), "scripts/github-cron-ping.sh");
    const raw = readFileSync(workflowPath, "utf8");
    const script = readFileSync(pingScript, "utf8");
    expect(raw).toMatch(/cron:\s*["']\*\/15 \* \* \* \*["']/);
    expect(raw).toContain("github-cron-ping.sh /api/cron/process-background-jobs");
    expect(script).toContain("x-cron-signature:");
  });

  it("runs refresh-rank-cache every 5 minutes via shared ping script", () => {
    const workflowPath = join(process.cwd(), ".github/workflows/cron-refresh-rank-cache.yml");
    const pingScript = join(process.cwd(), "scripts/github-cron-ping.sh");
    const raw = readFileSync(workflowPath, "utf8");
    const script = readFileSync(pingScript, "utf8");
    expect(raw).toMatch(/cron:\s*["']\*\/5 \* \* \* \*["']/);
    expect(raw).toContain("github-cron-ping.sh /api/cron/refresh-rank-cache");
    expect(script).toContain("openssl dgst -sha256 -hmac");
  });

  it("runs check-mastery-decay daily via shared ping script", () => {
    const workflowPath = join(process.cwd(), ".github/workflows/cron-check-mastery-decay.yml");
    const pingScript = join(process.cwd(), "scripts/github-cron-ping.sh");
    const raw = readFileSync(workflowPath, "utf8");
    const script = readFileSync(pingScript, "utf8");
    expect(raw).toMatch(/cron:\s*["']0 7 \* \* \*["']/);
    expect(raw).toContain("github-cron-ping.sh /api/cron/check-mastery-decay");
    expect(script).toContain("openssl dgst -sha256 -hmac");
  });
});
