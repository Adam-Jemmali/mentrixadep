import { isApCalcAbDivisionKey } from "@/features/divisions/ap-calc-ab-division";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { isApCalcSubjectName } from "@/features/xp/calibrated-rank";

const QUEST_SUMMARY_MAX = 72;

export function isApCalcQuestForBattleLog(
  metadata: Record<string, unknown> | null | undefined,
  prompt: string,
): boolean {
  const course =
    typeof metadata?.course === "string"
      ? metadata.course
      : typeof metadata?.subject === "string"
        ? metadata.subject
        : "";
  if (course && isApCalcSubjectName(course)) return true;

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.startsWith(`Practice: ${AP_CALC_AB_SUBJECT}`)) return true;

  return false;
}

export function truncateBattleLogSummary(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= QUEST_SUMMARY_MAX) return trimmed;
  return `${trimmed.slice(0, QUEST_SUMMARY_MAX - 1).trim()}…`;
}

export type DuelBattleLogOutcome = "win" | "loss" | "tie";

export function duelOutcomeForViewer(params: {
  viewerId: string;
  studentId: string;
  opponentStudentId: string | null;
  winner: "student" | "opponent" | "tie" | null;
}): DuelBattleLogOutcome | null {
  if (params.winner === "tie") return "tie";
  if (params.winner == null) return null;

  const asStudent = params.studentId === params.viewerId;
  if (params.winner === "student") return asStudent ? "win" : "loss";
  if (params.winner === "opponent") {
    return !asStudent && params.opponentStudentId === params.viewerId ? "win" : "loss";
  }
  return null;
}

export function formatDuelBattleLogSummary(params: {
  outcome: DuelBattleLogOutcome;
  opponentLabel: string;
}): string {
  const outcomeLabel =
    params.outcome === "win" ? "Win" : params.outcome === "loss" ? "Loss" : "Tie";
  return `Duel ${outcomeLabel} vs ${params.opponentLabel}`;
}

export function isApCalcDuelForBattleLog(divisionKey: string): boolean {
  return isApCalcAbDivisionKey(divisionKey);
}
