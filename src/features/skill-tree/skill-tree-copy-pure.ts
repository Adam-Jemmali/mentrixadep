import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import type { SkillTreeLabelKind } from "@/features/skill-tree/types";

const SKILL_TREE_LABELS: Record<
  SkillTreeLabelKind,
  { icon: VocabIconName; text: string }
> = {
  next: { icon: "focus-ring", text: "Next" },
  open: { icon: "quest", text: "Open" },
  solid: { icon: "practice-pack", text: "Solid" },
  weak: { icon: "practice-pack", text: "Weak" },
  locked: { icon: "skills", text: "Locked" },
  review: { icon: "retest", text: "Review" },
  opened: { icon: "breakthrough", text: "Opened" },
  clearMisses: { icon: "practice-pack", text: "Clear misses" },
  recovered: { icon: "xp", text: "Recovered" },
  faster: { icon: "momentum", text: "Faster" },
};

export function skillTreeLabel(
  kind: SkillTreeLabelKind,
): { icon: VocabIconName; text: string } {
  return SKILL_TREE_LABELS[kind];
}
