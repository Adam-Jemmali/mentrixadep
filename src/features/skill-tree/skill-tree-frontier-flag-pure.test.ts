import { describe, expect, it } from "vitest";
import { isSkillTreeFrontierEnabled } from "@/features/skill-tree/skill-tree-frontier-flag-pure";

describe("skill tree frontier flag", () => {
  it("defaults on when unset", () => {
    expect(isSkillTreeFrontierEnabled({})).toBe(true);
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "" })).toBe(true);
  });

  it("turns off for 0 / false / off", () => {
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "0" })).toBe(false);
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "false" })).toBe(false);
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "OFF" })).toBe(false);
  });

  it("stays on for 1 / true", () => {
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "1" })).toBe(true);
    expect(isSkillTreeFrontierEnabled({ SKILL_TREE_FRONTIER: "true" })).toBe(true);
  });
});
