export const STUDIO_LOOP = {
  masteryTitle: "Student mastery before publish",
  masterySub: "Pins nodes this call package covers. Same grid the Mentrixer sees.",
  masteryLoading: "Loading mastery grid…",
  masteryUnavailable: "Mastery grid needs AP Calculus AB for this session.",
  masteryNoCallNodes:
    "This package does not map to a skill node yet. Showing the full grid. Edit follow-ups or key points to name a node, then refresh.",
  masteryCallNodesLabel: "Nodes this call package covers",
  guideNotesLabel: "Guide notes",
  guideNotesHint: (learnerName: string) =>
    `What ${learnerName} struggled with, what you clarified, and what to reinforce next.`,
  guideNotesPlaceholder: (learnerName: string) =>
    `e.g. ${learnerName} mixed up the +C on indefinite integrals. We fixed Power Rule on √x after rewriting as x^(1/2).`,
  practicePromptsTitle: "Practice prompts",
  practicePromptsSub: "Plain text for this Mentrixer. No Quest links.",
} as const;
