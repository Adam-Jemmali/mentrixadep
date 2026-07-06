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
    verdict: "First attempts lock rank.",
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
    title: "Earnings · 30d",
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
    title: "Student mastery grid",
    description: `${studentName} · ${course}`,
    verdict: "Verified first attempts show what is locked for rank.",
    nextAction: "Target nodes with no verified attempt before the session.",
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
