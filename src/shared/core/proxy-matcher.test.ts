import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readMatcherPattern(): string {
  const raw = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
  const match = raw.match(/matcher:\s*\[[\s\S]*?"([^"]+)"/);
  expect(match?.[1], "proxy matcher regex").toBeTruthy();
  return match![1]!;
}

function middlewareWouldRun(pathname: string, pattern: string): boolean {
  const anchored = pattern.startsWith("^") ? pattern : `^${pattern}$`;
  return new RegExp(anchored).test(pathname);
}

describe("proxy matcher exclusions", () => {
  it("skips middleware for cron and stripe webhook routes", () => {
    const pattern = readMatcherPattern();
    expect(middlewareWouldRun("/api/cron/process-background-jobs", pattern)).toBe(false);
    expect(middlewareWouldRun("/api/cron/complete-sessions", pattern)).toBe(false);
    expect(middlewareWouldRun("/api/stripe/webhook", pattern)).toBe(false);
    expect(middlewareWouldRun("/student", pattern)).toBe(true);
    expect(middlewareWouldRun("/api/health", pattern)).toBe(true);
  });
});
