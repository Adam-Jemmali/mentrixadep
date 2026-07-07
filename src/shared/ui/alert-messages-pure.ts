import { MENTRIXA_FIRST_ANSWER } from "@/features/copy/mentrixa-simple-copy-pure";

export type MentrixaAlertStatus = "default" | "accent" | "success" | "warning" | "danger";

export type SubscriptionAlertKind = "success" | "canceled" | "checkout_error";

export type VerifiedFirstAttemptAlertKind = "onboarding" | "guest_preview" | "practice_pack";

export type MentrixaAlertMessage = {
  status: MentrixaAlertStatus;
  title: string;
  description: string;
  nextAction?: string;
};

export function subscriptionAlertMessage(
  kind: SubscriptionAlertKind,
  error?: string,
): MentrixaAlertMessage {
  switch (kind) {
    case "success":
      return {
        status: "success",
        title: "Momentum subscription started.",
        description: "Stripe is confirming your payment.",
        nextAction: "Your benefits activate as soon as confirmation lands.",
      };
    case "canceled":
      return {
        status: "default",
        title: "Checkout canceled.",
        description: "No charge was made.",
        nextAction: "Pick annual or monthly and try again when you are ready.",
      };
    case "checkout_error":
      return {
        status: "danger",
        title: "Could not start checkout.",
        description: error?.trim() || "Stripe did not return a checkout session.",
        nextAction: "Retry checkout or return to the hub and come back later.",
      };
  }
}

export function verifiedFirstAttemptAlertMessage(
  kind: VerifiedFirstAttemptAlertKind,
  subjectLabel: string,
): MentrixaAlertMessage {
  switch (kind) {
    case "onboarding":
      return {
        status: "accent",
        title: MENTRIXA_FIRST_ANSWER.only,
        description: MENTRIXA_FIRST_ANSWER.rankMovesOn,
        nextAction: MENTRIXA_FIRST_ANSWER.fiveSkillsUnlock(subjectLabel),
      };
    case "guest_preview":
      return {
        status: "accent",
        title: MENTRIXA_FIRST_ANSWER.only,
        description: `${subjectLabel} practice preview uses the same reviewed item bank as signed in students.`,
        nextAction: "Sign up free to save your permanent rank.",
      };
    case "practice_pack":
      return {
        status: "accent",
        title: MENTRIXA_FIRST_ANSWER.locksRank,
        description: "Reviewed item bank only. Each skill counts once toward rank.",
        nextAction: MENTRIXA_FIRST_ANSWER.practiceNeverMovesRank,
      };
  }
}

export function practiceWrongAnswerAlertMessage(explanation: string): MentrixaAlertMessage {
  return {
    status: "warning",
    title: "Not quite",
    description: explanation,
    nextAction: "This attempt is recorded. Continue when you are ready.",
  };
}

export function practiceLockedAttemptAlertMessage(): MentrixaAlertMessage {
  return {
    status: "warning",
    title: "Answer locked",
    description: MENTRIXA_FIRST_ANSWER.alreadyLocked,
    nextAction: "Practice here for review only. Rank will not move.",
  };
}
