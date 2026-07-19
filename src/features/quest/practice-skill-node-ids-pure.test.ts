import { describe, expect, it } from "vitest";
import type { PracticeQuestion } from "@/features/quest/practice-quest-types";
import { collectPracticeSkillNodeIds } from "@/features/quest/practice-skill-node-ids-pure";
import { assertNodeIdsUnlocked } from "@/features/skill-tree/assert-node-unlocked";

function questions(value: unknown[]): PracticeQuestion[] {
  return value as PracticeQuestion[];
}

describe("collectPracticeSkillNodeIds", () => {
  it("collects question-level and multi-part skill node IDs", () => {
    expect(
      collectPracticeSkillNodeIds(
        questions([
          { kind: "mcq", skillNodeId: "outer-mcq" },
          {
            kind: "multi_part",
            skillNodeId: "outer-multi",
            parts: [
              { skillNodeId: "part-a" },
              { skillNodeId: "part-b" },
            ],
          },
        ]),
      ),
    ).toEqual(["outer-mcq", "outer-multi", "part-a", "part-b"]);
  });

  it("collects part IDs when the multi-part question has no outer ID", () => {
    expect(
      collectPracticeSkillNodeIds(
        questions([
          {
            kind: "multi_part",
            parts: [{ skillNodeId: "part-only" }, {}],
          },
        ]),
      ),
    ).toEqual(["part-only"]);
  });

  it("deduplicates IDs while preserving encounter order", () => {
    expect(
      collectPracticeSkillNodeIds(
        questions([
          {
            kind: "multi_part",
            skillNodeId: "shared",
            parts: [{ skillNodeId: "shared" }, { skillNodeId: "next" }],
          },
          { kind: "free_response", skillNodeId: "next" },
        ]),
      ),
    ).toEqual(["shared", "next"]);
  });

  it("ignores questions and parts without skill node IDs", () => {
    expect(
      collectPracticeSkillNodeIds(
        questions([
          { kind: "short_answer" },
          { kind: "multi_part", parts: [{}, {}] },
        ]),
      ),
    ).toEqual([]);
  });

  it("rejects a locked nested part with the exact practice error", () => {
    const pack = questions([
      {
        kind: "multi_part",
        skillNodeId: "outer",
        parts: [{ skillNodeId: "locked-part" }],
      },
    ]);

    expect(() =>
      assertNodeIdsUnlocked(
        collectPracticeSkillNodeIds(pack),
        new Map([["locked-part", ["required-parent"]]]),
        new Set(["outer"]),
      ),
    ).toThrowError("Locked. Open prior skill.");
  });
});
