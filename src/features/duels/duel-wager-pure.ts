/** XP-only duel stakes. No money. No tokens. */

export const DUEL_WAGER_CAP_FRACTION = 0.1;
/** After a loss, total_xp must stay at or above this floor. */
export const DUEL_WAGER_MIN_XP_AFTER_LOSS = 50;

export function maxDuelWagerXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) return 0;
  return Math.floor(totalXp * DUEL_WAGER_CAP_FRACTION);
}

/** Hard cap after anti-exploit floor: cannot leave total_xp below 50 on a loss. */
export function maxAffordableDuelWagerXp(totalXp: number): number {
  const byCap = maxDuelWagerXp(totalXp);
  const byFloor = Math.max(0, Math.floor(totalXp) - DUEL_WAGER_MIN_XP_AFTER_LOSS);
  return Math.min(byCap, byFloor);
}

export function isValidDuelWagerAmount(amount: number, totalXp: number): boolean {
  if (!Number.isInteger(amount) || amount <= 0) return false;
  if (amount > maxDuelWagerXp(totalXp)) return false;
  return totalXp - amount >= DUEL_WAGER_MIN_XP_AFTER_LOSS;
}

export function duelWagerPot(challengerWager: number, opponentWager: number): number {
  return Math.max(0, challengerWager) + Math.max(0, opponentWager);
}
