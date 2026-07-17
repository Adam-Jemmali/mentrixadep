import { describe, expect, it } from "vitest";
import {
  addInterventionRetestDelay,
  DUEL_LOSS_RETEST_DELAY_MS,
  isInterventionRetestDue,
  MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS,
  MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS,
  STUDIO_INTERVENTION_RETEST_DELAY_MS,
} from "@/features/intervention-retests/schedule-intervention-retests-pure";
import { interventionRetestPostAccuracy } from "@/features/intervention-retests/complete-intervention-retests-pure";
import {
  resolveFirstMissedSkillNodeId,
  resolveMissedSkillNodeIds,
} from "@/features/intervention-retests/duel-retest";

describe("schedule-intervention-retests-pure", () => {
  it("schedules studio interventions 48h out", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = addInterventionRetestDelay(base, "studio_package");
    expect(scheduled.getTime() - base.getTime()).toBe(STUDIO_INTERVENTION_RETEST_DELAY_MS);
  });

  it("schedules duel loss interventions 72h out", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = addInterventionRetestDelay(base, "duel_loss");
    expect(scheduled.getTime() - base.getTime()).toBe(DUEL_LOSS_RETEST_DELAY_MS);
  });

  it("schedules momentum studio interventions 24h out", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = addInterventionRetestDelay(base, "session", { priorityRetest: true });
    expect(scheduled.getTime() - base.getTime()).toBe(MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS);
  });

  it("schedules momentum duel loss interventions 36h out", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = addInterventionRetestDelay(base, "duel_loss", { priorityRetest: true });
    expect(scheduled.getTime() - base.getTime()).toBe(MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS);
  });

  it("treats future scheduled_for as not due", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isInterventionRetestDue(future)).toBe(false);
  });

  it("treats past scheduled_for as due", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isInterventionRetestDue(past)).toBe(true);
  });
});

describe("interventionRetestPostAccuracy", () => {
  it("maps 0–1 fractions to 0–100 points", () => {
    expect(interventionRetestPostAccuracy(0.75)).toBe(75);
    expect(interventionRetestPostAccuracy(1)).toBe(100);
  });

  it("keeps values already on the 0–100 scale", () => {
    expect(interventionRetestPostAccuracy(80)).toBe(80);
  });
});

describe("resolveMissedSkillNodeIds", () => {
  it("returns every unique wrong-answer node", () => {
    const nodeIds = resolveMissedSkillNodeIds(
      [
        { prompt: "q1", choices: ["a", "b"], correctIndex: 0, skillNodeId: "node-a" },
        { prompt: "q2", choices: ["a", "b"], correctIndex: 1, skillNodeId: "node-b" },
        { prompt: "q3", choices: ["a", "b"], correctIndex: 0, skillNodeId: "node-a" },
      ],
      [1, 0, 1],
    );
    expect(nodeIds).toEqual(["node-a", "node-b"]);
  });

  it("returns empty when every answer is correct", () => {
    expect(
      resolveMissedSkillNodeIds(
        [{ prompt: "q1", choices: ["a", "b"], correctIndex: 0, skillNodeId: "node-a" }],
        [0],
      ),
    ).toEqual([]);
  });
});

describe("resolveFirstMissedSkillNodeId", () => {
  it("returns the first wrong answer node", () => {
    const nodeId = resolveFirstMissedSkillNodeId(
      [
        { prompt: "q1", choices: ["a", "b"], correctIndex: 0, skillNodeId: "node-a" },
        { prompt: "q2", choices: ["a", "b"], correctIndex: 1, skillNodeId: "node-b" },
      ],
      [0, 0],
    );
    expect(nodeId).toBe("node-b");
  });

  it("returns null when every answer is correct", () => {
    const nodeId = resolveFirstMissedSkillNodeId(
      [{ prompt: "q1", choices: ["a", "b"], correctIndex: 0, skillNodeId: "node-a" }],
      [0],
    );
    expect(nodeId).toBeNull();
  });
});
