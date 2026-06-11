import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("killed features stay removed from the app tree", () => {
  it("has no clans or resolve feature modules", () => {
    expect(existsSync(join(ROOT, "src/features/clans"))).toBe(false);
    expect(existsSync(join(ROOT, "src/features/resolve"))).toBe(false);
  });

  it("has no learning path UI components", () => {
    expect(existsSync(join(ROOT, "src/features/learning-path/ui"))).toBe(false);
    expect(existsSync(join(ROOT, "src/app/(app)/student/learning-path/learning-path-client.tsx"))).toBe(
      false,
    );
  });

  it("keeps only redirect shells for retired student routes", () => {
    const retiredClientFiles = [
      "src/app/(app)/student/clan/clan-browse-client.tsx",
      "src/app/(app)/student/clan/create/clan-create-form.tsx",
      "src/app/(app)/student/clan/[clanId]/clan-dashboard-client.tsx",
      "src/app/(app)/student/resolve/ResolvePageClient.tsx",
      "src/app/(app)/student/resolve/[problemId]/resolve-problem-client.tsx",
    ];
    for (const rel of retiredClientFiles) {
      expect(existsSync(join(ROOT, rel))).toBe(false);
    }
  });
});
