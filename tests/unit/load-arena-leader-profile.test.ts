import { describe, expect, it } from "vitest";
import {
  arenaLeaderAvatarInitial,
  buildArenaLeaderProfile,
  resolveAvatarFromAuthMetadata,
} from "@/features/live-board/load-arena-leader-profile";

describe("buildArenaLeaderProfile", () => {
  it("uses XP account rank for badge tier, not percentile-inflated tier", () => {
    const profile = buildArenaLeaderProfile(
      {
        userId: "user-1",
        displayName: "Trapdime",
        email: null,
        username: "trapdime",
        settingsAvatarUrl: null,
        totalXp: 120,
        accuracyPercent: 71,
        verifiedCount: 7,
        percentile: 99,
      },
      null,
    );

    expect(profile.accountRankTier).toBe("Wanderer");
    expect(profile.accountRankLevel).toBe(1);
    expect(profile.topPercent).toBe(1);
  });

  it("falls back to username initial when display name is generic", () => {
    expect(
      arenaLeaderAvatarInitial({
        displayName: "Mentrixer",
        username: "vacina5883",
      }),
    ).toBe("V");
  });
});

describe("resolveAvatarFromAuthMetadata", () => {
  it("reads Google picture metadata", () => {
    expect(
      resolveAvatarFromAuthMetadata({
        picture: "https://lh3.googleusercontent.com/a/example",
      }),
    ).toBe("https://lh3.googleusercontent.com/a/example");
  });
});
