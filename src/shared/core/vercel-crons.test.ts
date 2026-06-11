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

  it("includes required payout pipeline crons", () => {
    const cfg = readVercelConfig();
    const crons = cfg.crons ?? [];

    const requiredPaths = [
      "/api/cron/complete-sessions",
      "/api/cron/process-payouts",
      "/api/cron/process-background-jobs",
    ];

    for (const requiredPath of requiredPaths) {
      const cron = crons.find((c) => c.path === requiredPath);
      expect(cron, `Missing cron for ${requiredPath}`).toBeTruthy();
      expect(cron?.schedule?.trim().length, `Missing schedule for ${requiredPath}`).toBeGreaterThan(0);
    }
  });
});
