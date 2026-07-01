export type MentrixaProfileTabId = "identity" | "standing" | "share";

export type MentrixaStudioFilterTabId = "all" | "generated" | "pending";

export type MentrixaTabMessage = {
  label: string;
  verdict: string;
  nextAction: string;
};

export function profileTabMessage(tab: MentrixaProfileTabId): MentrixaTabMessage {
  switch (tab) {
    case "identity":
      return {
        label: "Identity",
        verdict: "Your display name and privacy settings shape how Guides see you before sessions.",
        nextAction: "Keep rank card public.",
      };
    case "standing":
      return {
        label: "Standing",
        verdict: "Division XP and battle log show arena activity, not verified first-attempt rank.",
        nextAction: "Run quests to move verified skills; duels move division standing.",
      };
    case "share":
      return {
        label: "Share",
        verdict: "Your public rank passport shows verified first attempts only.",
        nextAction: "Keep rank card public if you want a shareable verified passport.",
      };
  }
}

export function studioFilterTabMessage(tab: MentrixaStudioFilterTabId): MentrixaTabMessage {
  switch (tab) {
    case "all":
      return {
        label: "All sessions",
        verdict: "Every past session with a transcript can become a reviewed Studio package.",
        nextAction: "Filter to pending rows when you need packages to publish.",
      };
    case "generated":
      return {
        label: "Published",
        verdict: "Published packages are learner-visible after Guide review.",
        nextAction: "Open a row to edit draft content before the next publish.",
      };
    case "pending":
      return {
        label: "No package yet",
        verdict: "Sessions without packages still need transcript conversion in Studio.",
        nextAction: "Generate from transcript, then review before publish.",
      };
  }
}

export function profileTabsAriaLabel(): string {
  return "Profile sections";
}

export function studioFilterTabsAriaLabel(): string {
  return "Studio session filters";
}
