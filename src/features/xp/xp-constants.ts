/** Central XP amounts — use only from server actions. */
export const XP = {
  SESSION_COMPLETE: 100,
  SESSION_RATE: 50,
  QUEST_COMPLETE: 75,
  /** Practice pack: all questions correct */
  QUEST_PERFECT_BONUS: 50,
  DUEL_WIN: 150,
  /** Participation when you do not win (and not a tie) */
  DUEL_LOSS: 50,
  /** Phoenix recovery after a five-miss slump then Solid */
  PHOENIX_RECOVERY: 50,
  /** Both sides when a duel ends in a tie */
  DUEL_TIE: 50,
  /** Granted once when you reach a 3-win duel streak */
  DUEL_STREAK_ON_FIRE_BONUS: 100,
  /** First session completed that calendar day (UTC) */
  DAILY_FIRST_SESSION_BONUS: 25,
  TUTOR_AI_PACKAGE_PUBLISH: 200,
  WELCOME_FIRST_SESSION: 100,
  /** Referred learner: one-time bonus after attribution (signup). */
  REFERRAL_WELCOME_SIGNUP: 100,
  /** Referrer: when referred user completes first session (cron). */
  REFERRAL_FIRST_BOOKING: 500,
  /** Weekly division leaderboard (cron grants; idempotent keys) */
  WEEKLY_DIVISION_TOP_1: 500,
  WEEKLY_DIVISION_TOP_2: 250,
  WEEKLY_DIVISION_TOP_3: 100,
  /** Winning division war — granted to active contributors (cron). */
  DIVISION_WAR_WIN: 200,
} as const;
