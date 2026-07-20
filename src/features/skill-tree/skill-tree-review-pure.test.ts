import { describe, expect, it } from "vitest";
import {
  isSkillTreeReviewDue,
  skillTreeNodeHref,
  skillTreeNodeLabelKind,
} from "@/features/skill-tree/skill-tree-review-pure";

describe("skill tree review due", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");

  it("is due when overdue for verified or proficient", () => {
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: "2026-07-18T11:00:00.000Z",
        now,
        state: "verified",
      }),
    ).toBe(true);
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: "2026-07-18T11:00:00.000Z",
        now,
        state: "proficient",
      }),
    ).toBe(true);
  });

  it("is due inside the 24h alert window", () => {
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: "2026-07-19T06:00:00.000Z",
        now,
        state: "verified",
      }),
    ).toBe(true);
  });

  it("is not due beyond 24h or for ineligible states", () => {
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: "2026-07-20T12:00:00.000Z",
        now,
        state: "verified",
      }),
    ).toBe(false);
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: "2026-07-18T11:00:00.000Z",
        now,
        state: "weak",
      }),
    ).toBe(false);
    expect(
      isSkillTreeReviewDue({
        nextReviewAt: null,
        now,
        state: "verified",
      }),
    ).toBe(false);
  });

  it("labels review ahead of cause and next", () => {
    expect(
      skillTreeNodeLabelKind({
        unlocked: true,
        reviewDue: true,
        isFocus: true,
        isCause: true,
        state: "verified",
      }),
    ).toBe("review");
  });

  it("routes review href through decay alert quest url", () => {
    expect(
      skillTreeNodeHref({
        nodeName: "Chain Rule",
        reviewDue: true,
      }),
    ).toContain("Chain");
    expect(
      skillTreeNodeHref({
        nodeName: "Chain Rule",
        reviewDue: false,
      }),
    ).toContain("Chain");
  });
});
