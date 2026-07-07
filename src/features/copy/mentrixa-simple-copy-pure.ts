/**
 * Plain-language labels for Mentrixa's rank rule:
 * one answer per skill counts forever; practice after that does not move rank.
 */
export const MENTRIXA_FIRST_ANSWER = {
  singular: "first answer",
  plural: "first answers",
  title: "First answer",
  pluralTitle: "First answers",
  only: "First answers only",
  your: "your first answer",
  yourPlural: "your first answers",
  locks: "Your first answer locks.",
  locksRank: "Your first answer locks your rank.",
  rankMovesOn: "Your rank moves on your first answer only.",
  onePerSkillLocked: "One first answer per skill. Locked forever.",
  practiceNeverMovesRank: "Practice after that never moves rank.",
  alreadyLocked: "This skill already has a locked first answer on record.",
  guideLift: "Better first answers on skills you taught live.",
  guideImpactShort: "Better first answers after live sessions.",
  passportShows: "Your public passport shows first answers only.",
  duelsNotRank: "Duels move division standing, not first-answer rank.",
  signUpToLock: "Sign up to lock your first answers.",
  fiveSkillsUnlock: (subjectLabel: string) =>
    `Five ${subjectLabel} skills with a locked first answer unlock peer standing.`,
} as const;

export const MENTRIXA_RANK_PROOFS_DETAIL = `${MENTRIXA_FIRST_ANSWER.onePerSkillLocked} ${MENTRIXA_FIRST_ANSWER.practiceNeverMovesRank}`;
