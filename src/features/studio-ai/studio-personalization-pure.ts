/** Studio package personalization helpers (no AI). */

export type StudioCallSignalKind =
  | "transcript"
  | "chat"
  | "screen_share"
  | "whiteboard"
  | "guide_notes"
  | "prior_sessions"
  | "course_only";

export type StudioCallSignals = {
  hasTranscript: boolean;
  hasChat: boolean;
  hasScreenShare: boolean;
  hasWhiteboard: boolean;
  hasGuideNotes: boolean;
  hasPriorSessions: boolean;
};

export function detectStudioCallSignals(input: {
  contextBlocks: string[];
  guideNotes?: string | null;
}): StudioCallSignals {
  const joined = input.contextBlocks.join("\n").toLowerCase();
  return {
    hasTranscript:
      joined.includes("recording-derived transcript") ||
      joined.includes("transcript excerpt"),
    hasChat: joined.includes("in-call chat"),
    hasScreenShare:
      joined.includes("screen-sharing timeline") ||
      joined.includes("screen-share/visual summary"),
    hasWhiteboard: joined.includes("whiteboard activity"),
    hasGuideNotes: Boolean(input.guideNotes?.trim()),
    hasPriorSessions: joined.includes("earlier sessions with this learner"),
  };
}

export function primaryStudioCallSignal(signals: StudioCallSignals): StudioCallSignalKind {
  if (signals.hasTranscript) return "transcript";
  if (signals.hasChat) return "chat";
  if (signals.hasScreenShare) return "screen_share";
  if (signals.hasWhiteboard) return "whiteboard";
  if (signals.hasGuideNotes) return "guide_notes";
  if (signals.hasPriorSessions) return "prior_sessions";
  return "course_only";
}

export function studioPersonalizationDirective(params: {
  learnerName: string;
  guideName: string;
  signals: StudioCallSignals;
}): string {
  const learner = params.learnerName.trim() || "the learner";
  const guide = params.guideName.trim() || "the Guide";
  const primary = primaryStudioCallSignal(params.signals);

  const lines: string[] = [
    `Personalization mode for ${learner} with ${guide}:`,
  ];

  switch (primary) {
    case "transcript":
      lines.push(
        "Primary source: spoken call transcript. Quote or paraphrase what they said. Summary, key points, flashcards, exercises, and follow-ups must track that conversation.",
      );
      break;
    case "chat":
      lines.push(
        "Primary source: in-call chat only (little or no spoken transcript). Personalize 100% from chat lines between Guide and Mentrixer. Name what they typed about.",
      );
      break;
    case "screen_share":
      lines.push(
        "Primary source: screen share / visual activity (little chat or speech). Personalize from what was shown or worked on screen. Do not invent spoken dialogue.",
      );
      break;
    case "whiteboard":
      lines.push(
        "Primary source: whiteboard activity. Personalize from drawing and clear events as evidence of worked problems. Stay concrete about practice on the board.",
      );
      break;
    case "guide_notes":
      lines.push(
        `Primary source: Guide notes from ${guide}. Personalize every section from those notes about ${learner}. Do not invent a full lecture beyond the notes.`,
      );
      break;
    case "prior_sessions":
      lines.push(
        `Primary source: prior sessions with ${learner}. Continuity package only. Say this call left thin live signals and reinforce the last shared thread.`,
      );
      break;
    case "course_only":
      lines.push(
        `Thin live signals for this call. Write a short honest package for ${learner} on the course only. State that live call detail was limited. No fake struggles or fake dialogue.`,
      );
      break;
  }

  if (params.signals.hasChat && primary !== "chat") {
    lines.push("Also weave in-call chat lines when they add specificity.");
  }
  if (params.signals.hasScreenShare && primary !== "screen_share") {
    lines.push("Also use screen-share markers when they show what was on screen.");
  }
  if (params.signals.hasWhiteboard && primary !== "whiteboard") {
    lines.push("Also use whiteboard activity when it shows worked problems.");
  }
  if (params.signals.hasGuideNotes && primary !== "guide_notes") {
    lines.push("Guide notes override guesses when they conflict with thin signals.");
  }

  return lines.join("\n");
}

export function studioGuideNotesPlaceholder(learnerName: string): string {
  const name = learnerName.trim() || "the learner";
  return `e.g. ${name} mixed up the +C on indefinite integrals. We fixed Power Rule on √x after rewriting as x^(1/2).`;
}

export function studioPackageMustNameLearner(summary: string, learnerName: string): boolean {
  const name = learnerName.trim();
  if (!name || name.toLowerCase() === "the learner") return true;
  return summary.toLowerCase().includes(name.toLowerCase());
}

export type StudioPackageTopicSource = {
  summary?: string | null;
  keyPoints?: string[] | null;
  followUpTopics?: string[] | null;
  practiceTitles?: string[] | null;
  flashcardQuestions?: string[] | null;
  practicePrompts?: string[] | null;
};

/** Flatten package text into topic-like strings for skill-node matching. */
export function collectStudioPackageTopicCandidates(source: StudioPackageTopicSource): string[] {
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed) out.push(trimmed);
  };

  push(source.summary);
  for (const item of source.keyPoints ?? []) push(item);
  for (const item of source.followUpTopics ?? []) push(item);
  for (const item of source.practiceTitles ?? []) push(item);
  for (const item of source.flashcardQuestions ?? []) push(item);
  for (const item of source.practicePrompts ?? []) push(item);

  return out;
}
