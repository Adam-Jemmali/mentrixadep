import { describe, expect, it } from "vitest";
import { skillTreeLabel } from "@/features/skill-tree/skill-tree-copy-pure";
import type { SkillTreeLabelKind } from "@/features/skill-tree/types";

describe("skillTreeLabel", () => {
  it.each<[SkillTreeLabelKind, string, string]>([
    ["next", "focus-ring", "Next"],
    ["open", "quest", "Open"],
    ["solid", "practice-pack", "Solid"],
    ["weak", "practice-pack", "Weak"],
    ["locked", "skills", "Locked"],
    ["review", "retest", "Review"],
    ["opened", "breakthrough", "Opened"],
    ["clearMisses", "practice-pack", "Clear misses"],
    ["recovered", "xp", "Recovered"],
    ["faster", "momentum", "Faster"],
    ["cause", "skills", "Cause"],
  ])("maps %s to %s / %s", (kind, icon, text) => {
    expect(skillTreeLabel(kind)).toEqual({ icon, text });
  });
});
