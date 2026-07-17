export const BEFORE_AFTER_SHARE_DELTA_MIN = 15;

export type BeforeAfterShareInput = {
  nodeName: string;
  beforeValue: number;
  afterValue: number;
  guideName?: string | null;
  rankUsername?: string | null;
};

export function beforeAfterDeltaPoints(before: number, after: number): number {
  return Math.round(after - before);
}

export function shouldCreateBeforeAfterShare(delta: number | null | undefined): boolean {
  if (delta == null || !Number.isFinite(delta)) return false;
  return delta >= BEFORE_AFTER_SHARE_DELTA_MIN;
}

export function beforeAfterShareNotificationBody(nodeName: string, deltaPoints: number): string {
  const node = nodeName.trim() || "this skill";
  return `You improved ${node} by ${deltaPoints} percentage points. One tap to share.`;
}

export function formatShareAccuracy(value: number): string {
  return `${Math.round(value)}%`;
}

export function rankSharePath(username: string | null | undefined): string | null {
  const u = username?.trim();
  if (!u) return null;
  return `/rank/${encodeURIComponent(u)}`;
}
