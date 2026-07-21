import { describe, expect, it } from "vitest";
import {
  buildGuideActiveStudents,
  guideImpactHeroTone,
  toTopImpactChips,
} from "@/features/tutor/guide-home-pure";

describe("guide-home-pure", () => {
  it("ranks impact hero tone bands", () => {
    expect(guideImpactHeroTone(82)).toBe("gold");
    expect(guideImpactHeroTone(70)).toBe("violet");
    expect(guideImpactHeroTone(59)).toBe("steel");
  });

  it("builds active student roster from sessions", () => {
    const roster = buildGuideActiveStudents([
      {
        student_id: "s1",
        end_time: "2026-07-01T12:00:00Z",
        student_profile: { display_name: "Alex" },
      },
      {
        student_id: "s1",
        end_time: "2026-07-10T12:00:00Z",
        student_profile: { display_name: "Alex" },
      },
      {
        student_id: "s2",
        start_time: "2026-07-05T12:00:00Z",
        student_email: "jamie@example.com",
      },
    ]);
    expect(roster).toHaveLength(2);
    expect(roster[0]?.studentId).toBe("s1");
    expect(roster[0]?.sessionCount).toBe(2);
  });

  it("maps top impact node chips", () => {
    const chips = toTopImpactChips([
      {
        skillNodeId: "n1",
        nodeName: "Chain rule",
        subject: "AP Calculus AB",
        impactScore: 88,
        studentsCounted: 4,
        afterAccuracy: 80,
        beforeAccuracy: 55,
        impactLift: 25,
      },
    ]);
    expect(chips[0]?.nodeName).toBe("Chain rule");
    expect(chips[0]?.impactScore).toBe(88);
  });
});
