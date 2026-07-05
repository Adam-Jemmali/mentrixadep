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
  why: "Courses end. Certificates lie. Your first attempt on each skill is permanent proof of what you actually know compared to real Mentrixers.",
  whyNow:
    "Every day you practice without a verified first attempt is a day your rank stays wrong. One quest run starts the record.",
  verdict: "Mentrixa is the only arena where rank moves on verified first attempts, not retakes.",
  nextAction: "Run your next quest node and lock what is true today.",
};

export const MENTRIXA_GOAL_COMPACT: Pick<MentrixaGoalBlock, "who" | "whyNow" | "verdict"> = {
  who: MENTRIXA_GOAL.who,
  whyNow: MENTRIXA_GOAL.whyNow,
  verdict: MENTRIXA_GOAL.verdict,
};

export const MENTRIXA_GOAL_LANDING: MentrixaGoalBlock = {
  who: "Calculus AB students who need a public badge.",
  why: "First tries are permanent proof against real Mentrixers.",
  whyNow: "One quest locks today's record before the exam.",
  verdict: "Badge moves on first tries only.",
  nextAction: "Run one quest free.",
};
