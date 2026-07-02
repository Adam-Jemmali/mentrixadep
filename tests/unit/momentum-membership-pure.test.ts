import { describe, expect, it } from "vitest";
import { buildPackGoalVerdict } from "@/features/payments/momentum-membership-pure";

describe("buildPackGoalVerdict", () => {
  it("recommends pack when exam is soon and credits fall short", () => {
    const result = buildPackGoalVerdict({ daysUntilExam: 47 });
    expect(result?.recommendPack).toBe(true);
    expect(result?.verdict).toContain("47 days");
    expect(result?.verdict).toContain("1 session short");
  });

  it("returns null when exam is far out", () => {
    expect(buildPackGoalVerdict({ daysUntilExam: 200 })).toBeNull();
  });

  it("suggests optional pack when monthly credits cover runway", () => {
    const result = buildPackGoalVerdict({ daysUntilExam: 90 });
    expect(result?.recommendPack).toBe(false);
    expect(result?.verdict).toContain("monthly credits cover");
  });
});
