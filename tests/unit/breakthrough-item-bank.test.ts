import { describe, expect, it } from "vitest";
import {
  addBreakthroughPackDeferDelay,
  BREAKTHROUGH_PACK_DEFER_MS,
  buildBreakthroughPackUnavailableMessage,
  isBreakthroughQueueRowAvailable,
  itemBankRowToBreakthroughQuestion,
  mapBreakthroughItemBankRows,
} from "@/features/breakthrough-events/breakthrough-item-bank-pure";
import { matchSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node-pure";

const node = {
  id: "node-1",
  unit_number: 2,
  unit_name: "Differentiation",
  node_name: "Chain Rule",
  exam_stakes: "AP exam free response",
};

const sampleItem = (id: string, difficulty = 1000) => ({
  id,
  skill_node_id: "node-1",
  prompt: `Prompt ${id}`,
  options: ["A", "B", "C", "D"],
  correct_answer: "B",
  explanation: `Explanation ${id}`,
  difficulty_rating: difficulty,
});

describe("breakthrough item bank pack", () => {
  it("maps approved rows to practice MCQs with skill node metadata", () => {
    const question = itemBankRowToBreakthroughQuestion(sampleItem("i1"), node);
    expect(question).toMatchObject({
      id: "i1",
      kind: "mcq",
      skillNodeId: "node-1",
      subtopicTag: "Chain Rule",
      topicTag: "Differentiation",
      examStakes: "AP exam free response",
    });
  });

  it("requires at least three valid items", () => {
    const pack = mapBreakthroughItemBankRows(
      [sampleItem("a"), sampleItem("b")],
      node,
    );
    expect(pack).toBeNull();
  });

  it("builds the unavailable copy without live generation", () => {
    expect(buildBreakthroughPackUnavailableMessage("Chain Rule")).toBe(
      "Your breakthrough on Chain Rule is confirmed. Your follow-up practice is being prepared.",
    );
  });

  it("defers breakthrough pack assignment for 48 hours", () => {
    const base = new Date("2026-07-11T12:00:00.000Z");
    const deferred = addBreakthroughPackDeferDelay(base);
    expect(deferred.getTime() - base.getTime()).toBe(BREAKTHROUGH_PACK_DEFER_MS);
  });

  it("treats future available_at as not yet due", () => {
    const now = Date.parse("2026-07-11T12:00:00.000Z");
    expect(isBreakthroughQueueRowAvailable("2026-07-12T12:00:00.000Z", now)).toBe(false);
    expect(isBreakthroughQueueRowAvailable("2026-07-10T12:00:00.000Z", now)).toBe(true);
  });
});

describe("resolve skill node for breakthrough concept", () => {
  it("matches subtopic labels to skill node slugs", () => {
    const match = matchSkillNodeForConcept(
      [{ id: "n1", node_name: "Chain Rule", node_slug: "chain-rule" }],
      "chain rule",
    );
    expect(match?.id).toBe("n1");
  });
});
