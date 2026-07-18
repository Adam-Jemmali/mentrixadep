import { describe, expect, it } from "vitest";
import { pickStudentHubDoNext } from "@/features/student-profile/student-hub-do-next-pure";

describe("pickStudentHubDoNext", () => {
  it("returns Beat Line when a rival is in range", () => {
    const next = pickStudentHubDoNext({
      beatLine: {
        mode: "chase",
        verdict: "You are 2 verified nodes behind Alex.",
        ctaLabel: "Close the gap",
        ctaHref: "/student/quest",
        categoryIcon: "duels",
        ctaIcon: "quest",
        lines: [
          { icon: "rival", text: "Alex is ahead." },
          { icon: "quest", text: "Pass them in Quest." },
        ],
      },
    });
    expect(next?.verdict).toContain("Alex");
    expect(next?.ctaHref).toBe("/student/quest");
    expect(next?.categoryIcon).toBe("duels");
    expect(next?.ctaIcon).toBe("quest");
    expect(next?.lines.every((line) => Boolean(line.icon))).toBe(true);
  });

  it("returns null when Beat Line is unavailable", () => {
    expect(pickStudentHubDoNext({ beatLine: null })).toBeNull();
  });
});
