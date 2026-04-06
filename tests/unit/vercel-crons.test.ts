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

describe("vercel cron config", () => {
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
});
