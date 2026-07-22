import { MENTRIXA_FIRST_ANSWER } from "@/features/copy/mentrixa-simple-copy-pure";

export type MentrixaDrawerKind =
  | "quest_tools"
  | "guide_session_requests"
  | "guide_earnings"
  | "guide_mastery_grid";

export type MentrixaDrawerMessage = {
  title: string;
  description: string;
  verdict: string;
  nextAction: string;
};

export function questToolsDrawerMessage(): MentrixaDrawerMessage {
  return {
    title: "Quest tools",
    description: "Session context for this verified pack.",
    verdict: MENTRIXA_FIRST_ANSWER.locksRank,
    nextAction: "Swipe left or right on the question card to move between items.",
  };
}

export function guideSessionRequestsDrawerMessage(): MentrixaDrawerMessage {
  return {
    title: "Requests",
    description: "Approve or decline bookings.",
    verdict: "Pending blocks your calendar.",
    nextAction: "Accept to confirm. Decline to release.",
  };
}

export function guideEarningsDrawerMessage(): MentrixaDrawerMessage {
  return {
    title: "Earnings. 30d",
    description: "Completed sessions only.",
    verdict: "Posts when session ends.",
    nextAction: "Check payouts if one is missing.",
  };
}

export function guideMasteryGridDrawerMessage(
  studentName: string,
  course: string,
): MentrixaDrawerMessage {
  return {
    title: "Student context",
    description: `${studentName}. ${course}`,
    verdict: "Locked first answers show what counts for rank.",
    nextAction: "Review target nodes before you join the call.",
  };
}

export function mentrixaDrawerMessage(
  kind: MentrixaDrawerKind,
  context?: { studentName?: string; course?: string },
): MentrixaDrawerMessage {
  switch (kind) {
    case "quest_tools":
      return questToolsDrawerMessage();
    case "guide_session_requests":
      return guideSessionRequestsDrawerMessage();
    case "guide_earnings":
      return guideEarningsDrawerMessage();
    case "guide_mastery_grid":
      return guideMasteryGridDrawerMessage(
        context?.studentName?.trim() || "Student",
        context?.course?.trim() || "Course",
      );
  }
}
