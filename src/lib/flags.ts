export function isWaitlistEnabled(): boolean {
  const raw = process.env.WAITLIST_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "no"].includes(raw);
}

export function isWaitlistEnabledClient(): boolean {
  const raw = process.env.NEXT_PUBLIC_WAITLIST_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "no"].includes(raw);
}
