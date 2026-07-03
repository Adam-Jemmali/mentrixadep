export type MentrixaBillingInterval = "annual" | "monthly";

export type MentrixaContactCategory =
  | "feedback"
  | "bug"
  | "billing"
  | "partnership"
  | "other";

export type MentrixaRadioMessage = {
  verdict: string;
  nextAction: string;
};

export function billingIntervalRadioMessage(
  interval: MentrixaBillingInterval,
): MentrixaRadioMessage {
  if (interval === "annual") {
    return {
      verdict: "",
      nextAction: "Choose annual if you expect at least one Guide session per month.",
    };
  }
  return {
    verdict: "Monthly billing keeps Momentum flexible with no annual commitment.",
    nextAction: "Switch to annual later from subscribe if your cadence firms up.",
  };
}

export function contactCategoryRadioMessage(
  category: MentrixaContactCategory,
): MentrixaRadioMessage {
  switch (category) {
    case "feedback":
      return {
        verdict: "Product feedback shapes what ships next on mentrixa.one.",
        nextAction: "Name the screen and what you expected instead.",
      };
    case "bug":
      return {
        verdict: "Repro steps beat vague reports every time.",
        nextAction: "Include browser, account role, and what you clicked last.",
      };
    case "billing":
      return {
        verdict: "Billing issues need the email on the Stripe receipt.",
        nextAction: "Paste the charge date and last four digits if you have them.",
      };
    case "partnership":
      return {
        verdict: "Partnership notes go to the team that owns distribution.",
        nextAction: "Lead with audience size and what you want to build together.",
      };
    case "other":
      return {
        verdict: "We route misc notes to the right owner within one business day.",
        nextAction: "State whether you are a Mentrixer, Guide, or neither.",
      };
  }
}

export function billingIntervalRadioAriaLabel(): string {
  return "Momentum billing interval";
}

export function contactCategoryRadioAriaLabel(): string {
  return "Contact message category";
}
