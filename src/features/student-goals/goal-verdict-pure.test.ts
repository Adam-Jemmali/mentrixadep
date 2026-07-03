import { describe, expect, it } from "vitest";
import {
  applyGoalToVerdict,
  daysUntilGoalDate,
  estimateNodesNeededForPercentileTarget,
  isExamGoalUrgent,
} from "@/features/student-goals/goal-verdict-pure";
import type { StudentGoal } from "@/features/student-goals/types";

const baseVerdict = {
  changed: "Test changed",
  reason: "Test reason",
  nextAction: { label: "Practice Limits", href: "/student/quest" },
};

const examGoal: StudentGoal = {
  id: "g1",
  userId: "u1",
  subject: "AP Calculus AB",
  goalType: "exam_date",
  targetDate: "2026-07-10",
  targetPercentile: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  active: true,
};

describe("isExamGoalUrgent", () => {
  it("is urgent within 14 days", () => {
    const now = new Date("2026-07-01T12:00:00.000Z").getTime();
    expect(isExamGoalUrgent(examGoal, now)).toBe(true);
  });

  it("is not urgent beyond 14 days", () => {
    const now = new Date("2026-06-01T12:00:00.000Z").getTime();
    expect(isExamGoalUrgent(examGoal, now)).toBe(false);
  });
});

describe("estimateNodesNeededForPercentileTarget", () => {
  it("returns remaining nodes above threshold gap", () => {
    expect(estimateNodesNeededForPercentileTarget(40, 70, 3, 20)).toBe(11);
  });
});

describe("applyGoalToVerdict", () => {
  it("overrides nextAction for urgent exam goals", () => {
    const now = new Date("2026-07-05T12:00:00.000Z").getTime();
    const next = applyGoalToVerdict(
      baseVerdict,
      examGoal,
      {
        currentPercentile: 50,
        verifiedNodesAbove70: 2,
        totalSubjectNodes: 20,
        highestImpactNode: { skillNodeId: "n1", nodeName: "Chain Rule" },
      },
      now,
    );
    expect(next.nextAction.label).toContain("Exam in");
    expect(next.nextAction.label).toContain("Chain Rule");
  });

  it("states percentile gap explicitly", () => {
    const goal: StudentGoal = {
      ...examGoal,
      goalType: "percentile_target",
      targetDate: null,
      targetPercentile: 80,
    };
    const next = applyGoalToVerdict(baseVerdict, goal, {
      currentPercentile: 45,
      verifiedNodesAbove70: 4,
      totalSubjectNodes: 20,
      highestImpactNode: { skillNodeId: "n2", nodeName: "Limits" },
    });
    expect(next.nextAction.label).toContain("Need");
    expect(next.nextAction.label).toContain("70%");
  });
});

describe("daysUntilGoalDate", () => {
  it("counts whole days until target", () => {
    const days = daysUntilGoalDate(
      "2026-07-10",
      new Date("2026-07-01T12:00:00.000Z").getTime(),
    );
    expect(days).toBe(9);
  });
});
