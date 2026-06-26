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
  nextActionLine: string;
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
