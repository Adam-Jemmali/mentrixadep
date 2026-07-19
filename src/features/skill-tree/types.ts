import type { MasteryNodeState } from "@/features/mastery-grid/types";

export type SkillTreeEdge = { parentId: string; childId: string };

export type SkillTreeNodeInput = {
  id: string;
  prerequisites: string[];
};

export type FrontierNodeView = {
  id: string;
  state: MasteryNodeState;
  unlocked: boolean;
};

export type FrontierView = {
  focusId: string;
  focus: FrontierNodeView;
  parents: FrontierNodeView[];
  children: FrontierNodeView[];
};

export type SkillTreeLabelKind =
  | "next"
  | "open"
  | "solid"
  | "weak"
  | "locked"
  | "review"
  | "opened"
  | "clearMisses"
  | "recovered"
  | "faster";
