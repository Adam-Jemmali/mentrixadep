import { resolveAvatarFromAuthMetadata } from "@/features/live-board/load-arena-leader-profile";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";

export function isLikelyImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url.pathname)) return true;
    if (url.hostname.includes("googleusercontent.com")) return true;
    if (url.pathname.includes("/storage/v1/object/")) return true;
    if (url.pathname.includes("/storage/v1/render/image/")) return true;
    return false;
  } catch {
    return false;
  }
}

export function resolvePassportAvatarUrl(input: {
  settingsUrl: string | null | undefined;
  authMetadata: Record<string, unknown> | undefined;
}): string | null {
  const settingsCandidate = normalizeArenaAvatarUrl(input.settingsUrl ?? null);
  if (settingsCandidate && isLikelyImageUrl(settingsCandidate)) {
    return settingsCandidate;
  }

  const authCandidate = resolveAvatarFromAuthMetadata(input.authMetadata);
  if (authCandidate && isLikelyImageUrl(authCandidate)) {
    return authCandidate;
  }

  return null;
}
