import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type MasteryNodeState = "none" | "weak" | "proficient" | "verified";

export type MasteryGridNode = {
  id: string;
  nodeName: string;
  nodeSlug: string;
  displayOrder: number;
  state: MasteryNodeState;
  accuracyPercent: number | null;
  practiceAttempts: number;
  practiceCorrect: number;
  hasVerifiedAttempt: boolean;
  verifiedCorrect: boolean | null;
  /** Better-than % among verified Mentrixers on this node (snapshot). */
  peerBetterThanPercent: number | null;
};

export type MasteryGridGlobalRank = {
  accuracyPercent: number;
  verifiedCount: number;
  topPercent: number | null;
};

export type MasteryGridUnit = {
  unitNumber: number;
  unitName: string;
  nodes: MasteryGridNode[];
};

export type MasteryGridData = {
  subject: string;
  units: MasteryGridUnit[];
  globalRank?: MasteryGridGlobalRank;
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

export type QuestOpenedHighlight = {
  kind: "opened";
  nodeId: string;
  nodeName: string;
  icon: VocabIconName;
  text: string;
};

export type QuestPhoenixHighlight = {
  kind: "recovered";
  nodeId: string;
  nodeName: string;
  icon: "xp";
  text: "Recovered";
  xpAwarded: number;
};

export type QuestFasterHighlight = {
  kind: "faster";
  nodeId: string;
  nodeName: string;
  icon: VocabIconName;
  text: "Faster";
};
