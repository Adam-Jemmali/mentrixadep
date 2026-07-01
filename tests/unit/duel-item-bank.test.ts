import { describe, expect, it } from "vitest";
import {
  duelRowsToQuestionPack,
  itemBankRowToDuelQuestion,
  pickDuelItemBankRows,
} from "@/features/duels/duel-item-bank-pure";

const sampleRow = (id: string, nodeId: string) => ({
  id,
  skill_node_id: nodeId,
  prompt: `Prompt ${id}`,
  options: ["A", "B", "C", "D"],
  correct_answer: "B",
});

describe("duel item bank selection", () => {
  it("maps item bank rows to duel MCQ schema", () => {
    const question = itemBankRowToDuelQuestion(sampleRow("i1", "n1"));
    expect(question).toEqual({
      prompt: "Prompt i1",
      choices: ["A", "B", "C", "D"],
      correctIndex: 1,
      type: "mcq",
      skillNodeId: "n1",
    });
  });

  it("prefers primary nodes then backfills from other AP Calc nodes", () => {
    const rows = [
      sampleRow("p1", "primary"),
      sampleRow("p2", "primary"),
      sampleRow("b1", "backfill"),
      sampleRow("b2", "backfill"),
    ];
    const picked = pickDuelItemBankRows(rows, new Set(["primary"]), 3, 3);
    expect(picked).toHaveLength(3);
    expect(picked.filter((row) => row.skill_node_id === "primary")).toHaveLength(2);
    expect(picked.filter((row) => row.skill_node_id === "backfill")).toHaveLength(1);
  });

  it("returns a reduced pack when fewer than target items exist", () => {
    const rows = [
      sampleRow("q1", "primary"),
      sampleRow("q2", "primary"),
      sampleRow("q3", "primary"),
    ];
    const picked = pickDuelItemBankRows(rows, new Set(["primary"]), 10, 3);
    expect(picked).toHaveLength(3);
    const pack = duelRowsToQuestionPack(picked);
    expect(pack?.questions).toHaveLength(3);
    expect(pack?.itemBankIds?.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("rejects packs below the duel minimum", () => {
    expect(pickDuelItemBankRows([sampleRow("a", "n")], new Set(["n"]), 10, 3)).toEqual([]);
    expect(duelRowsToQuestionPack([sampleRow("a", "n")])).toBeNull();
  });
});
