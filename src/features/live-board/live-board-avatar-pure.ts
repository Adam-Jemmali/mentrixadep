/** Deterministic accent from display name — unique fallback when no profile photo. */
export function arenaAvatarAccent(displayName: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    from: `hsl(${hue} 72% 42%)`,
    to: `hsl(${(hue + 36) % 360} 68% 28%)`,
  };
}

export function arenaAvatarInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "M";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase();
}

export function normalizeArenaAvatarUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
