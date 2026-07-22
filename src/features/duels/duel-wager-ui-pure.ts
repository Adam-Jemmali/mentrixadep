import { DUEL_WAGER_CAP_FRACTION } from "@/features/duels/duel-wager-pure";

export const DUEL_WAGER_STEP_COPY = {
  title: "Add a stake",
  subtitle: "Optional. XP only. No real money.",
  addCta: "Add this stake",
  skipCta: "Skip. No stake.",
  winPrefix: "If you win:",
  losePrefix: "If you lose:",
  currentXpLabel: "XP",
  maxStakePrefix: "Max stake:",
  maxStakeSuffix: "XP",
  maxStakeCapNote: `${Math.round(DUEL_WAGER_CAP_FRACTION * 100)}% of yours`,
  needMoreXp: "Need more XP. Keep at least 50 after a loss.",
} as const;

export function duelInviteStakeCopy(challengerName: string, amount: number): string {
  const first = challengerName.trim().split(/\s+/)[0] || challengerName.trim() || "Challenger";
  return `${first} wants to stake ${amount.toLocaleString()} XP each`;
}
