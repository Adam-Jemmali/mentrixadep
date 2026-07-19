import { describe, expect, it } from "vitest";
import {
  duelPromptFingerprint,
  duelRowsToQuestionPack,
  filterDuelRowsToUnlockedNodes,
  itemBankRowToDuelQuestion,
  pickDuelItemBankRows,
} from "@/features/duels/duel-item-bank-pure";

const sampleRow = (id: string, nodeId: string, prompt = `Prompt ${id}`) => ({
  id,
  skill_node_id: nodeId,
  prompt,
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

  it("caps questions per skill node for competitive variety", () => {
    const rows = [
      sampleRow("a1", "n1", "Stem A"),
      sampleRow("a2", "n1", "Stem B"),
      sampleRow("a3", "n1", "Stem C"),
      sampleRow("b1", "n2", "Stem D"),
      sampleRow("b2", "n2", "Stem E"),
      sampleRow("c1", "n3", "Stem F"),
    ];
    const picked = pickDuelItemBankRows(rows, new Set(["n1", "n2", "n3"]), 4, 3, {
      maxPerNode: 2,
      rng: () => 0.1,
    });
    expect(picked.length).toBeGreaterThanOrEqual(3);
    const counts = new Map<string, number>();
    for (const row of picked) {
      counts.set(row.skill_node_id, (counts.get(row.skill_node_id) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("skips excluded recent item ids and duplicate stems among picks", () => {
    const rows = [
      sampleRow("keep1", "n1", "Unique stem one"),
      sampleRow("skip", "n1", "Seen already"),
      sampleRow("dup", "n2", "Seen already"),
      sampleRow("keep2", "n2", "Unique stem two"),
      sampleRow("keep3", "n3", "Unique stem three"),
    ];
    const picked = pickDuelItemBankRows(rows, new Set(["n1", "n2", "n3"]), 3, 3, {
      excludeIds: new Set(["skip"]),
      rng: () => 0.2,
    });
    expect(picked.map((r) => r.id)).not.toContain("skip");
    const seenFingerprints = picked.map((r) => duelPromptFingerprint(r.prompt));
    expect(new Set(seenFingerprints).size).toBe(seenFingerprints.length);
    expect(picked).toHaveLength(3);
  });

  it("fingerprints strip latex noise", () => {
    expect(duelPromptFingerprint("Find $x^2$ now")).toBe("find now");
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

  it("removes rows for locked nodes before duel selection", () => {
    const rows = [
      sampleRow("open-1", "open"),
      sampleRow("locked-1", "locked"),
      sampleRow("open-2", "open"),
    ];

    expect(
      filterDuelRowsToUnlockedNodes(rows, new Set(["open"])).map((row) => row.id),
    ).toEqual(["open-1", "open-2"]);
  });
});
