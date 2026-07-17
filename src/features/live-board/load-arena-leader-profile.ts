import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import {
  arenaAvatarInitial,
  normalizeArenaAvatarUrl,
} from "@/features/live-board/live-board-avatar-pure";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import {
  explainFirstAttemptAccuracy,
  explainPeerStanding,
  peerTopPercent,
} from "@/features/xp/rank-statistics-pure";

export type ArenaLeaderProfileInput = {
  userId: string;
  displayName: string | null;
  email: string | null;
  username: string | null;
  settingsAvatarUrl: string | null;
  totalXp: number;
  accuracyPercent: number;
  verifiedCount: number;
  percentile: number;
};

export type ArenaLeaderProfile = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  accountRankTier: string;
  accountRankLevel: number;
  accuracyPercent: number;
  verifiedCount: number;
  percentile: number;
  topPercent: number;
  accuracyLine: string;
  peerStandingLine: string;
};

function resolveDisplayName(
  settingsDisplayName: string | null | undefined,
  email: string | null | undefined,
  username?: string | null,
): string {
  const trimmed =
    typeof settingsDisplayName === "string" ? settingsDisplayName.trim() : "";
  if (trimmed) return trimmed.slice(0, 100);
  const handle = typeof username === "string" ? username.trim() : "";
  if (handle) return handle.slice(0, 100);
  const prefix = (email?.split("@")[0] ?? "").trim();
  if (prefix) return prefix.slice(0, 100);
  return "Mentrixer";
}

function resolveAvatarInitial(displayName: string, username: string | null): string {
  if (username && displayName.toLowerCase() === "mentrixer") {
    return arenaAvatarInitial(username);
  }
  return arenaAvatarInitial(displayName);
}

export function resolveAvatarFromAuthMetadata(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) return null;
  for (const key of ["avatar_url", "picture", "avatar"] as const) {
    const value = metadata[key];
    if (typeof value === "string") {
      const normalized = normalizeArenaAvatarUrl(value);
      if (normalized) return normalized;
    }
  }
  return null;
}

export function buildArenaLeaderProfile(
  input: ArenaLeaderProfileInput,
  avatarUrl: string | null,
): ArenaLeaderProfile {
  const displayName = resolveDisplayName(input.displayName, input.email, input.username);
  const xpRank = rankFromTotalXp(input.totalXp);
  const accountRank = getAccountRankByLevel(xpRank.level);
  const topPercent = peerTopPercent(input.percentile);

  return {
    userId: input.userId,
    displayName,
    username: input.username,
    avatarUrl,
    accountRankTier: normalizeRankTitle(accountRank.title),
    accountRankLevel: accountRank.level,
    accuracyPercent: input.accuracyPercent,
    verifiedCount: input.verifiedCount,
    percentile: input.percentile,
    topPercent,
    accuracyLine: explainFirstAttemptAccuracy(input.verifiedCount, input.accuracyPercent),
    peerStandingLine: explainPeerStanding(input.percentile),
  };
}

export function arenaLeaderAvatarInitial(profile: Pick<ArenaLeaderProfile, "displayName" | "username">): string {
  return resolveAvatarInitial(profile.displayName, profile.username);
}

export async function enrichArenaLeaderProfiles(
  inputs: ArenaLeaderProfileInput[],
): Promise<ArenaLeaderProfile[]> {
  const admin = createAdminClient();

  return Promise.all(
    inputs.map(async (input) => {
      let avatarUrl = normalizeArenaAvatarUrl(input.settingsAvatarUrl);
      let email = input.email;

      try {
        const { data } = await admin.auth.admin.getUserById(input.userId);
        email = email ?? data.user?.email ?? null;
        if (!avatarUrl) {
          avatarUrl = resolveAvatarFromAuthMetadata(
            data.user?.user_metadata as Record<string, unknown> | undefined,
          );
        }
      } catch {
        // Keep settings-only data when auth lookup fails.
      }

      return buildArenaLeaderProfile({ ...input, email }, avatarUrl);
    }),
  );
}
