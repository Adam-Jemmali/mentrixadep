/** Practice pack quests — stored in quests.metadata (questKind: "practice_pack"). */

import type {
  MasteryGridData,
  MasteryPackNodeSnapshot,
  QuestMasteryHighlight,
} from "@/features/mastery-grid/types";
import type {
  PartialCreditRule,
  SolutionStep,
} from "@/features/quest/components/step-feedback-pure";

export type PracticeDifficulty = "beginner" | "intermediate" | "advanced";
export type PracticePackType = "mcq" | "short_answer" | "problem_solving";

export type PracticeQuestionKind = "mcq" | "short_answer" | "problem_solving";

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
}

export interface PracticeQuestionWritten {
  id: string;
  kind: "short_answer" | "problem_solving";
  prompt: string;
  referenceAnswer: string;
  explanation: string;
}

export type PracticeQuestion = PracticeQuestionMcq | PracticeQuestionWritten;

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
  questVerdict?: import("@/features/guidance/verdict-engine-pure").Verdict;
  /** Skill node ids covered in this pack — drives post-quest skill tree focus. */
  packSkillNodeIds?: string[];
}
