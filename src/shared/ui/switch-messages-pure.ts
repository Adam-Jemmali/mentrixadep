import { MENTRIXA_FIRST_ANSWER } from "@/features/copy/mentrixa-simple-copy-pure";

export type MentrixaPrivacySwitchId =
  | "profile_visible_to_tutors"
  | "duel_opt_in"
  | "rank_card_public";

export type MentrixaNotificationSwitchId =
  | "email_session_reminders"
  | "email_session_booked"
  | "email_session_cancelled"
  | "email_weekly_summary"
  | "email_marketing";

export type MentrixaSettingsSwitchId = MentrixaPrivacySwitchId | MentrixaNotificationSwitchId;

export type MentrixaSwitchMessage = {
  verdict: string;
  nextAction: string;
};

export function privacySwitchMessage(id: MentrixaPrivacySwitchId): MentrixaSwitchMessage {
  switch (id) {
    case "profile_visible_to_tutors":
      return {
        verdict: "Guides only see what you expose before a session is booked.",
        nextAction: "Leave this on if you want discovery without a direct invite link.",
      };
    case "duel_opt_in":
      return {
        verdict: MENTRIXA_FIRST_ANSWER.duelsNotRank,
        nextAction: "Turn off when you need uninterrupted quest focus.",
      };
    case "rank_card_public":
      return {
        verdict: MENTRIXA_FIRST_ANSWER.passportShows,
        nextAction: "Keep this on after five skills unlock peer standing.",
      };
  }
}

export function notificationSwitchMessage(
  id: MentrixaNotificationSwitchId,
  context?: { isTutor?: boolean },
): MentrixaSwitchMessage {
  const isTutor = context?.isTutor ?? false;

  switch (id) {
    case "email_session_reminders":
      return {
        verdict: "Reminders fire one hour before a confirmed session.",
        nextAction: "Match this to your timezone on the Identity tab.",
      };
    case "email_session_booked":
      return {
        verdict: isTutor
          ? "You get a receipt when a Mentrixer books your slot."
          : "You get a receipt the moment a Guide confirms your booking.",
        nextAction: "Leave on until your calendar syncs session times reliably.",
      };
    case "email_session_cancelled":
      return {
        verdict: "Either party can cancel; this email is the audit trail.",
        nextAction: "Keep on if you reschedule often and need the paper trail.",
      };
    case "email_weekly_summary":
      return {
        verdict: isTutor
          ? "Weekly digest covers sessions taught and revenue, not verified rank."
          : "Weekly digest covers quest activity and XP, not verified rank.",
        nextAction: "Skim it Sunday to spot nodes you have not verified yet.",
      };
    case "email_marketing":
      return {
        verdict: "Product updates never change rank rules or paywall Arena.",
        nextAction: "Opt in only if you want ship notes from Mentrixa HQ.",
      };
  }
}

export function settingsSwitchMessage(
  id: MentrixaSettingsSwitchId,
  context?: { isTutor?: boolean },
): MentrixaSwitchMessage {
  if (id === "profile_visible_to_tutors" || id === "duel_opt_in" || id === "rank_card_public") {
    return privacySwitchMessage(id);
  }
  return notificationSwitchMessage(id, context);
}

export function privacySwitchGroupAriaLabel(): string {
  return "Privacy and visibility";
}

export function notificationSwitchGroupAriaLabel(): string {
  return "Email notification preferences";
}
