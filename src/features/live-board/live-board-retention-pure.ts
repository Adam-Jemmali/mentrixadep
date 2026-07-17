/** Public Arena feed retention window. Rows older than this are purged. */
export const LIVE_BOARD_RETENTION_MS = 48 * 60 * 60 * 1000;

/** ISO cutoff before which live_board_events rows should be deleted. */
export function liveBoardRetentionCutoffIso(nowMs = Date.now()): string {
  return new Date(nowMs - LIVE_BOARD_RETENTION_MS).toISOString();
}

export function isLiveBoardEventExpired(
  occurredAt: string,
  nowMs = Date.now(),
): boolean {
  const occurredMs = new Date(occurredAt).getTime();
  if (!Number.isFinite(occurredMs)) return false;
  return occurredMs < nowMs - LIVE_BOARD_RETENTION_MS;
}
