import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WORKFLOWS_DIR = join(process.cwd(), ".github", "workflows");

/** GitHub Actions `schedule` cron must not run more than once per day (credit + prod load). */
function isAtMostDailyGithubCron(schedule: string): boolean {
  const s = schedule.trim();
  if (!s) return false;
  if (/\*\/\d+/.test(s)) return false;
  const parts = s.split(/\s+/);
  if (parts.length < 5) return false;
  const minute = parts[0] ?? "";
  const hour = parts[1] ?? "";
  if (minute === "*" || hour === "*") return false;
  return true;
}

function extractScheduleCrons(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const schedules: string[] = [];
  let inSchedule = false;
  for (const line of lines) {
    if (/^\s*schedule:\s*$/.test(line)) {
      inSchedule = true;
      continue;
    }
    if (inSchedule && /^\S/.test(line) && !line.trim().startsWith("-")) {
      inSchedule = false;
    }
    if (inSchedule) {
      const m = line.match(/cron:\s*["']?([^"']+)["']?\s*$/);
      if (m?.[1]) schedules.push(m[1]);
    }
  }
  return schedules;
}

describe("GitHub workflow schedules", () => {
  const ALLOWED_SUB_DAILY_SCHEDULES = new Set([
    "cron-background-jobs.yml:*/15 * * * *",
    "cron-refresh-rank-cache.yml:*/5 * * * *",
  ]);

  it("schedules background jobs and rank cache via GitHub Actions", () => {
    const bgJobs = readFileSync(join(WORKFLOWS_DIR, "cron-background-jobs.yml"), "utf8");
    const rankCache = readFileSync(join(WORKFLOWS_DIR, "cron-refresh-rank-cache.yml"), "utf8");
    expect(bgJobs).toMatch(/cron:\s*["']\*\/15 \* \* \* \*["']/);
    expect(bgJobs).toContain("/api/cron/process-background-jobs");
    expect(bgJobs).toContain("x-cron-secret:");
    expect(rankCache).toMatch(/cron:\s*["']\*\/5 \* \* \* \*["']/);
    expect(rankCache).toContain("/api/cron/refresh-rank-cache");
    expect(rankCache).toContain("x-cron-secret:");
  });

  it("does not use sub-daily cron schedules (Actions credits)", () => {
    const files = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    for (const file of files) {
      const content = readFileSync(join(WORKFLOWS_DIR, file), "utf8");
      for (const schedule of extractScheduleCrons(content)) {
        if (ALLOWED_SUB_DAILY_SCHEDULES.has(`${file}:${schedule}`)) {
          continue;
        }
        expect(
          isAtMostDailyGithubCron(schedule),
          `${file} schedule "${schedule}" runs more than once per day`,
        ).toBe(true);
      }
    }
  });
});
