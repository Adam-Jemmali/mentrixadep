import type {
  MasteryGridData,
  MasteryNodeState,
} from "@/features/mastery-grid/types";

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

export type SkillTreeNode = {
  id: string;
  nodeName: string;
  nodeSlug: string;
  unitNumber: number;
  unitName: string;
  displayOrder: number;
  state: MasteryNodeState;
  prerequisites: string[];
  unlocked: boolean;
  nextReviewAt: string | null;
};

export type SkillTreeFocusCause = {
  tag: string;
  nodeId: string;
};

export type SkillTreeData = {
  subject: string;
  grid: MasteryGridData;
  nodes: SkillTreeNode[];
  frontier: FrontierView;
  focusNodeId: string;
  /** When Next was redirected by repeated failure tags. */
  focusCause: SkillTreeFocusCause | null;
  /** Reviewed miss items available for Clear misses. */
  mistakeItemCount: number;
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
  | "faster"
  | "cause";
