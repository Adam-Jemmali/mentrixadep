/** Crystal-clear Mentrixa positioning — who, why it matters, why now. */

export type MentrixaGoalBlock = {
  who: string;
  why: string;
  whyNow: string;
  verdict: string;
  nextAction: string;
};

export const MENTRIXA_GOAL: MentrixaGoalBlock = {
  who: "AP Calculus AB students who want a public rank they cannot fake.",
  why: "Courses end. Certificates lie. Your first answer on each skill is permanent proof.",
  whyNow:
    "Practice does not move rank. Your next first answer does.",
  verdict: "Mentrixa is the only arena where rank moves on your first answers, not retakes.",
  nextAction: "Run your next quest node and lock what is true today.",
};

export const MENTRIXA_GOAL_COMPACT: Pick<MentrixaGoalBlock, "who" | "whyNow" | "verdict"> = {
  who: MENTRIXA_GOAL.who,
  whyNow: MENTRIXA_GOAL.whyNow,
  verdict: MENTRIXA_GOAL.verdict,
};

export const MENTRIXA_GOAL_LANDING: MentrixaGoalBlock = {
  who: "Mentrixers climb rank. Guides earn impact. Same platform.",
  why: "Mentrixer rank from first answers. Guide Impact from sessions. Never mixed.",
  whyNow: "Calculus AB live. Pick your role.",
  verdict: "Two proof systems. One live feed.",
  nextAction: "Start as Mentrixer or apply as Guide.",
};
