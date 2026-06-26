export type MentrixaSpinnerKind = "stripe_checkout" | "quest_pack_load";

export type MentrixaSpinnerMessage = {
  title: string;
  ariaLabel: string;
  description?: string;
  verdict?: string;
  nextAction?: string;
};

export function stripeCheckoutSpinnerMessage(): MentrixaSpinnerMessage {
  return {
    title: "Opening secure Stripe checkout",
    ariaLabel: "Starting Stripe checkout",
    verdict: "No charge will occur until you confirm.",
  };
}

export function questPackLoadSpinnerMessage(): MentrixaSpinnerMessage {
  return {
    title: "Loading verified pack",
    ariaLabel: "Loading verified quest pack",
    description: "Questions from the reviewed item bank.",
    nextAction: "Get ready for your first attempt.",
  };
}

export function mentrixaSpinnerMessage(kind: MentrixaSpinnerKind): MentrixaSpinnerMessage {
  switch (kind) {
    case "stripe_checkout":
      return stripeCheckoutSpinnerMessage();
    case "quest_pack_load":
      return questPackLoadSpinnerMessage();
  }
}
