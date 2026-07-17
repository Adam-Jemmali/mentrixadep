import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Modules that must never be invokable as Next.js server actions. */
const INTERNAL_SERVER_ONLY_MODULES = [
  "src/features/xp/xp-awards.ts",
  "src/features/breakthrough-events/detect.ts",
  "src/features/breakthrough-events/guide-notify.ts",
  "src/features/divisions/division-weekly.ts",
  "src/features/rank-card/build-rank-card.ts",
  "src/features/comparison/load-comparison-context.ts",
  "src/features/demand-signal/reads.ts",
  "src/features/tutor/load-earnings-forecast.ts",
  "src/features/tutor/command-center-weekly-impact.ts",
  "src/features/jobs/enqueue.ts",
  "src/features/jobs/claim.ts",
];

function readModule(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("internal server-only modules", () => {
  it("does not export applyXpAward as a server action", () => {
    const source = readModule("src/features/xp/xp-awards.ts");
    expect(source).not.toMatch(/^"use server"/m);
    expect(source).toContain("Not a server action module");
    expect(source).toContain("export async function applyXpAward");
  });

  for (const modulePath of INTERNAL_SERVER_ONLY_MODULES) {
    it(`${modulePath} is not a server action module`, () => {
      const source = readModule(modulePath);
      expect(source, `${modulePath} must not use "use server"`).not.toMatch(/^"use server"/m);
    });
  }
});

describe("client-callable server actions with admin access", () => {
  it("requires auth on referral exports", () => {
    const source = readModule("src/features/referrals/referrals.ts");
    expect(source).toMatch(/^"use server"/m);
    expect(source).toContain("requireRole");
    expect(source).not.toContain("getCurrentUser");
  });

  it("requires auth on guide rematch badges", () => {
    const source = readModule("src/features/matchmaker/load-guide-rematch-badges.ts");
    expect(source).toMatch(/^"use server"/m);
    expect(source).toContain("requireRole");
    expect(source).toContain("Forbidden");
  });
});
