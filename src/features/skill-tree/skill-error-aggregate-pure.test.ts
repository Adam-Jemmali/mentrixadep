import { describe, expect, it } from "vitest";
import {
  aggregateSecondaryTagDeficits,
  failureTagFromDistractor,
  pickTopSecondaryDeficit,
  resolveCauseFocusNodeId,
} from "@/features/skill-tree/skill-error-aggregate-pure";

describe("skill error aggregate", () => {
  it("ranks secondary tags by frequency", () => {
    const deficits = aggregateSecondaryTagDeficits(
      [
        { skillNodeId: "chain", failureTag: "forgot inner", secondaryTags: ["trigonometry"] },
        { skillNodeId: "chain", failureTag: "x", secondaryTags: ["trigonometry", "power-rule"] },
        { skillNodeId: "chain", failureTag: "y", secondaryTags: ["trigonometry"] },
      ],
      1,
    );
    expect(deficits[0]).toEqual({ tag: "trigonometry", count: 3 });
    expect(deficits[1]).toEqual({ tag: "power-rule", count: 1 });
  });

  it("requires min count for top deficit", () => {
    expect(
      pickTopSecondaryDeficit([
        { skillNodeId: "a", failureTag: null, secondaryTags: ["trig"] },
      ]),
    ).toBeNull();
    expect(
      pickTopSecondaryDeficit([
        { skillNodeId: "a", failureTag: null, secondaryTags: ["trig"] },
        { skillNodeId: "a", failureTag: null, secondaryTags: ["trig"] },
      ])?.tag,
    ).toBe("trig");
  });

  it("routes locked cause to nearest unlocked ancestor", () => {
    const slugToNodeId = new Map([
      ["trigonometry", "trig"],
      ["chain-rule-basics", "chain"],
    ]);
    const parents = new Map([
      ["trig", [] as string[]],
      ["chain", ["trig"]],
    ]);
    const unlocked = new Set(["trig"]);

    expect(
      resolveCauseFocusNodeId({
        tag: "chain-rule-basics",
        slugToNodeId,
        parents,
        unlockedIds: unlocked,
      }),
    ).toBe("trig");

    expect(
      resolveCauseFocusNodeId({
        tag: "chain-rule-basics",
        slugToNodeId,
        parents,
        unlockedIds: new Set(["trig", "chain"]),
      }),
    ).toBe("chain");
  });

  it("reads distractor failure tag by option text or index", () => {
    expect(
      failureTagFromDistractor(
        { "Product rule": "confuses product", "1": "drops power" },
        "Product rule",
        2,
      ),
    ).toBe("confuses product");
    expect(failureTagFromDistractor({ "1": "drops power" }, "other", 1)).toBe(
      "drops power",
    );
    expect(failureTagFromDistractor({}, "x", 0)).toBeNull();
  });
});
