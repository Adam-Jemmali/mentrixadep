import { describe, expect, it } from "vitest";
import {
  buildGuideRematchBadgeLabel,
  pickBestRematchBadge,
} from "@/features/matchmaker/rematch-badge-pure";

describe("rematch-badge-pure", () => {
  it("formats badge label at 50%+", () => {
    expect(buildGuideRematchBadgeLabel(73, "Chain rule")).toBe(
      "Moved 73% of students on Chain rule",
    );
    expect(buildGuideRematchBadgeLabel(40, "Limits")).toBeNull();
  });

  it("prefers matching student nodes", () => {
    const badge = pickBestRematchBadge([
      { guideId: "g1", nodeName: "Limits", ratePercent: 80, matchesStudentNode: false },
      { guideId: "g1", nodeName: "Chain rule", ratePercent: 73, matchesStudentNode: true },
    ]);
    expect(badge?.nodeName).toBe("Chain rule");
    expect(badge?.label).toContain("73%");
  });
});
