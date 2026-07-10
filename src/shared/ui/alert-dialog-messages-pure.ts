import type { MentrixaAlertStatus } from "@/shared/ui/alert-messages-pure";

export type MentrixaConfirmDialogMessage = {
  status: MentrixaAlertStatus;
  title: string;
  description: string;
  nextAction: string;
  cancelLabel: string;
  confirmLabel: string;
};

export function cancelBookingConfirmMessage(refundEligible: boolean): MentrixaConfirmDialogMessage {
  return {
    status: "warning",
    title: "Cancel this Guide session?",
    description: refundEligible
      ? "This removes the booking from your schedule and frees the slot for someone else."
      : "This removes the booking from your schedule.",
    nextAction: refundEligible
      ? "You are still eligible for a full refund when you confirm."
      : "Refund eligibility may not apply this close to start time.",
    cancelLabel: "Keep session",
    confirmLabel: "Cancel session",
  };
}

export function clearAvatarConfirmMessage(): MentrixaConfirmDialogMessage {
  return {
    status: "warning",
    title: "Remove profile photo?",
    description: "Your Mentrixer card will show initials until you upload a new image.",
    nextAction: "Rank, XP, and locked first answers stay unchanged.",
    cancelLabel: "Keep photo",
    confirmLabel: "Remove photo",
  };
}

export function cancelMomentumRenewalConfirmMessage(
  periodEndLabel: string | null,
): MentrixaConfirmDialogMessage {
  const until = periodEndLabel
    ? ` until ${periodEndLabel}`
    : " through the end of your paid period";
  return {
    status: "warning",
    title: "Turn off Momentum renewal?",
    description: `You keep Momentum membership${until}. No further charges after that. Already paid time is not refunded.`,
    nextAction: "Included credits and member session rate stay available until access ends.",
    cancelLabel: "Keep membership",
    confirmLabel: "Turn off renewal",
  };
}

export function resumeMomentumRenewalConfirmMessage(
  periodEndLabel: string | null,
): MentrixaConfirmDialogMessage {
  const renews = periodEndLabel ? ` Renewal returns on ${periodEndLabel}.` : "";
  return {
    status: "success",
    title: "Resume Momentum renewal?",
    description: `Your membership stays active.${renews} Billing continues on your current plan.`,
    nextAction: "You can turn renewal off again any time before the next charge.",
    cancelLabel: "Leave off",
    confirmLabel: "Resume renewal",
  };
}
