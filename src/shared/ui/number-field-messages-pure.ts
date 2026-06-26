export type MentrixaNumberFieldMessage = {
  verdict: string;
  nextAction: string;
};

export type MentrixaAdminNumberFieldId = "max_quests_per_day" | "platform_fee_percent";

export type MentrixaGuideSessionNumberFieldId =
  | "session_default_duration"
  | "session_buffer_minutes";

export function adminNumberFieldMessage(
  fieldId: MentrixaAdminNumberFieldId,
): MentrixaNumberFieldMessage {
  switch (fieldId) {
    case "max_quests_per_day":
      return {
        verdict: "Quest caps protect item bank freshness and server load.",
        nextAction: "Raise only when reviewed pack volume supports it.",
      };
    case "platform_fee_percent":
      return {
        verdict: "Platform fee is the Mentrixa take before Guide payout.",
        nextAction: "Keep overrides within the range Guides already accepted.",
      };
  }
}

export function guideSessionNumberFieldMessage(
  fieldId: MentrixaGuideSessionNumberFieldId,
): MentrixaNumberFieldMessage {
  switch (fieldId) {
    case "session_default_duration":
      return {
        verdict: "Default duration sets every new availability slot you publish.",
        nextAction: "Match the length you actually teach in one sitting.",
      };
    case "session_buffer_minutes":
      return {
        verdict: "Buffer time blocks back-to-back bookings from colliding.",
        nextAction: "Leave enough gap to reset notes and join the next call.",
      };
  }
}

export function validateAdminQuestsPerDay(value: number): string | null {
  if (!Number.isFinite(value) || value < 1) {
    return "At least 1 quest per day is required";
  }
  if (value > 100) {
    return "Cap cannot exceed 100 quests per day";
  }
  return null;
}

export function validatePlatformFeePercent(value: number): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return "Fee cannot be negative";
  }
  if (value > 50) {
    return "Fee cannot exceed 50%";
  }
  return null;
}

export function validateSessionDurationMinutes(value: number): string | null {
  if (!Number.isFinite(value) || value < 15) {
    return "Sessions must be at least 15 minutes";
  }
  if (value > 120) {
    return "Default duration cannot exceed 120 minutes";
  }
  if (value % 15 !== 0) {
    return "Use 15-minute increments";
  }
  return null;
}

export function validateSessionBufferMinutes(value: number): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return "Buffer cannot be negative";
  }
  if (value > 60) {
    return "Buffer cannot exceed 60 minutes";
  }
  if (value % 5 !== 0) {
    return "Use 5-minute increments";
  }
  return null;
}
