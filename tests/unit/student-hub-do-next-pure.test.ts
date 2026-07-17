import { describe, expect, it } from "vitest";
import { pickStudentHubDoNext } from "@/features/student-profile/student-hub-do-next-pure";

describe("pickStudentHubDoNext", () => {
  it("returns Beat Line when a rival is in range", () => {
    const next = pickStudentHubDoNext({
      beatLine: {
        verdict: "You are 2 verified nodes behind Alex.",
        ctaLabel: "Close the gap",
        ctaHref: "/student/quest",
      },
    });
    expect(next?.verdict).toContain("Alex");
    expect(next?.ctaHref).toBe("/student/quest");
  });

  it("returns null when Beat Line is unavailable", () => {
    expect(pickStudentHubDoNext({ beatLine: null })).toBeNull();
  });
});
