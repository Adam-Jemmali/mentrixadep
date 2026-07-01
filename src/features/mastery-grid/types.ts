import type { Verdict } from "@/features/guidance/verdict-engine-pure";

export type MasteryNodeState = "none" | "weak" | "proficient" | "verified";

export type MasteryGridNode = {
  id: string;
  nodeName: string;
  nodeSlug: string;
  displayOrder: number;
  state: MasteryNodeState;
  accuracyPercent: number | null;
};

export type MasteryGridUnit = {
  unitNumber: number;
  unitName: string;
  nodes: MasteryGridNode[];
};

export type MasteryGridData = {
  subject: string;
  units: MasteryGridUnit[];
  /** @deprecated Use verdict — kept for tests and legacy callers */
  nextActionLine: string;
  verdict?: Verdict;
};

export type MasteryPackNodeSnapshot = {
  nodeName: string;
  state: MasteryNodeState;
  accuracyPercent: number | null;
};

export type QuestMasteryHighlight = {
  nodeId: string;
  nodeName: string;
  fromState: MasteryNodeState;
  toState: MasteryNodeState;
  unchanged: boolean;
  verdictLine: string;
};
