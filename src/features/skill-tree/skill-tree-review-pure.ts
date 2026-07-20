import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  decayAlertQuestUrl,
  isDecayAlertEligibleState,
  isWithinDecayAlertWindow,
} from "@/features/mastery-decay/decay-alerts-pure";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import type { SkillTreeLabelKind } from "@/features/skill-tree/types";

export function isSkillTreeReviewDue(input: {
  nextReviewAt: string | null | undefined;
  now?: Date;
  state: MasteryNodeState;
}): boolean {
  if (!isDecayAlertEligibleState(input.state)) return false;
  if (!input.nextReviewAt) return false;
  const at = Date.parse(input.nextReviewAt);
  if (!Number.isFinite(at)) return false;
  const now = input.now ?? new Date();
  const next = new Date(at);
  if (next.getTime() <= now.getTime()) return true;
  return isWithinDecayAlertWindow(next, now);
}

export function skillTreeNodeLabelKind(input: {
  unlocked: boolean;
  reviewDue: boolean;
  isFocus: boolean;
  isCause?: boolean;
  state: MasteryNodeState;
}): SkillTreeLabelKind {
  if (!input.unlocked) return "locked";
  if (input.reviewDue) return "review";
  if (input.isFocus && input.isCause) return "cause";
  if (input.isFocus) return "next";
  if (input.state === "proficient") return "solid";
  if (input.state === "weak") return "weak";
  return "open";
}

export function skillTreeNodeHref(input: {
  nodeName: string;
  reviewDue: boolean;
}): string {
  return input.reviewDue
    ? decayAlertQuestUrl(input.nodeName)
    : practiceNodeHref(input.nodeName);
}
