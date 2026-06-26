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
    nextAction: "Rank, XP, and verified first attempts stay unchanged.",
    cancelLabel: "Keep photo",
    confirmLabel: "Remove photo",
  };
}
