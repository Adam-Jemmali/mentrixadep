/** Practice pack quests — stored in quests.metadata (questKind: "practice_pack"). */

import type {
  MasteryGridData,
  MasteryPackNodeSnapshot,
  QuestMasteryHighlight,
  QuestOpenedHighlight,
} from "@/features/mastery-grid/types";
import type {
  PartialCreditRule,
  SolutionStep,
} from "@/features/quest/components/step-feedback-pure";
import type { MultiPartPart, MultiPartPartResult } from "@/features/quest/multi-part-pure";
import type { QuestStimulus } from "@/features/quest/quest-stimulus-pure";

export type PracticeDifficulty = "beginner" | "intermediate" | "advanced";
export type PracticePackType = "mcq" | "short_answer" | "problem_solving" | "mixed";

export type PracticeQuestionKind =
  | "mcq"
  | "short_answer"
  | "problem_solving"
  | "multi_part"
  | "free_response"
  | "complete_expression"
  | "drag_order"
  | "graph_feature";

export interface PracticeQuestionMcq {
  id: string;
  kind: "mcq";
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** AP Calculus AB item bank */
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  /** From skill_nodes.exam_stakes — shown as Exam stakes tooltip in quest UI. */
  examStakes?: string;
  solutionSteps?: SolutionStep[];
  answerExpression?: string;
  partialCreditRules?: PartialCreditRule[];
  correctAnswer?: string;
  /** Structured tables / function graphs shown above the prompt. */
  stimulus?: QuestStimulus[];
}

export interface PracticeQuestionWritten {
  id: string;
  kind: "short_answer" | "problem_solving";
  prompt: string;
  referenceAnswer: string;
  explanation: string;
  stimulus?: QuestStimulus[];
}

export interface PracticeQuestionFreeResponse {
  id: string;
  kind: "free_response";
  prompt: string;
  answerExpression: string;
  explanation: string;
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  examStakes?: string;
  solutionSteps?: SolutionStep[];
  partialCreditRules?: PartialCreditRule[];
  stimulus?: QuestStimulus[];
}

export interface PracticeQuestionCompleteExpression {
  id: string;
  kind: "complete_expression";
  prompt: string;
  blanks: Array<{ key: string; answerExpression: string; weight: number }>;
  explanation: string;
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  examStakes?: string;
  stimulus?: QuestStimulus[];
}

export interface PracticeQuestionDragOrder {
  id: string;
  kind: "drag_order";
  prompt: string;
  /** Correct order (server). Client receives a shuffled copy via public payload. */
  orderedItems: string[];
  explanation: string;
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  examStakes?: string;
  stimulus?: QuestStimulus[];
}

export interface PracticeQuestionGraphFeature {
  id: string;
  kind: "graph_feature";
  prompt: string;
  targets: import("@/features/quest/quest-interaction-formats-pure").GraphFeatureTarget[];
  /** When set, Mentrixer must sketch a curve; graded vs this expression. */
  answerExpression?: string;
  explanation: string;
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  examStakes?: string;
  stimulus?: QuestStimulus[];
  maxSelections?: number;
  /** Domain used for sketch polyline grading. */
  sketchDomain?: [number, number];
}

export interface PracticeQuestionMultiPart {
  id: string;
  kind: "multi_part";
  /** Shared AP exam stem / scenario. */
  prompt: string;
  parts: MultiPartPart[];
  explanation: string;
  skillNodeId?: string;
  topicTag?: string;
  subtopicTag?: string;
  unitNumber?: number;
  examStakes?: string;
  stimulus?: QuestStimulus[];
}

export type PracticeQuestion =
  | PracticeQuestionMcq
  | PracticeQuestionWritten
  | PracticeQuestionMultiPart
  | PracticeQuestionFreeResponse
  | PracticeQuestionCompleteExpression
  | PracticeQuestionDragOrder
  | PracticeQuestionGraphFeature;

export interface PracticePackMetadata {
  questKind: "practice_pack";
  subject: string;
  difficulty: PracticeDifficulty;
  packType: PracticePackType;
  accountLevelTitle: string;
  questionCount: number;
  timeLimitSec: number;
  course: string;
  questions: PracticeQuestion[];
  /** Filled during session */
  session?: PracticeSessionState;
  /** After completion */
  result?: PracticePackResult;
  /** MCQ options were shuffled so correctIndex is not always 0 */
  mcqOptionsShuffled?: boolean;
  /** Breakthrough adaptive follow-up */
  breakthroughEventId?: string;
  focusSubtopic?: string;
  /** Mastery states for pack nodes at session start (AP Calculus AB). */
  masteryBeforePack?: Record<string, MasteryPackNodeSnapshot>;
}

export interface PracticeSessionAnswer {
  questionId: string;
  index: number;
  correct: boolean;
  userResponse?: string;
  feedback?: string;
  partsCorrect?: number;
  partsTotal?: number;
  multiPart?: {
    finished: boolean;
    activePartIndex: number;
    parts: MultiPartPartResult[];
  };
}

export interface PracticeSessionState {
  startedAt: string;
  answers: PracticeSessionAnswer[];
  /** Current step (next question index) */
  currentIndex: number;
}

export interface PracticePackResult {
  correct: number;
  total: number;
  perfect: boolean;
  xpAwarded: number;
  perfectBonus: number;
  mistakeReviews?: { questionId: string; prompt: string; review: string }[];
  /** Verified-first-attempt rank receipt (AP Calculus AB). */
  rankVerdict?: string;
  rankNextAction?: string;
  newVerifiedSkills?: number;
  masteryGrid?: MasteryGridData;
  masteryHighlight?: QuestMasteryHighlight;
  openedHighlight?: QuestOpenedHighlight;
  questVerdict?: import("@/features/guidance/verdict-engine-pure").Verdict;
  /** Skill node ids covered in this pack — drives post-quest skill tree focus. */
  packSkillNodeIds?: string[];
}
