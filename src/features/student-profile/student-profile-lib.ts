import type { LevelTier } from "@/features/xp/levels";
import type { UserSettings } from "@/features/settings/user-settings";

export type StudentProfileViewer = "owner" | "admin" | "public";

export type StudentProfileDivisionBadge = {
  key: string;
  name: string;
  xp: number;
  tier: LevelTier;
  tierLabel: string;
};

export type StudentProfileAchievement = {
  id: string;
  completedAt: string;
  summary: string;
};

export type StudentProfileData = {
  studentId: string;
  viewer: StudentProfileViewer;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  memberSince: string;
  timezone: string;
  profileVisibleToTutors: boolean;
  totalXp: number;
  streakDays: number;
  /** Global account level (1–8). */
  accountLevel: number;
  levelLabel: string;
  xpInLevel: number;
  xpToNextLevel: number | null;
  nextLevelThreshold: number | null;
  courses: string[];
  completedSessionsCount: number;
  divisionBadges: StudentProfileDivisionBadge[];
  recentAchievements: StudentProfileAchievement[];
  /** Settings for the private form (owner only). Mirrors UserSettings for student-editable fields. */
  privateSettings: UserSettings | null;
  emailPrefix: string;
  /** Active divisions for focused division selector (owner form). */
  divisions: { key: string; name: string }[];
  /** Public Rank Card slug (owner / when public). */
  rankCardUsername: string | null;
  rankCardPublic: boolean;
  /** Best subject line for share copy (owner). */
  rankCardTopSubject: string | null;
  rankCardTopAccuracy: number;
};

/** XP progress width within current account level (0–1) for UI. */
export function xpTierProgressFraction(data: StudentProfileData): number {
  const toNext = data.xpToNextLevel;
  if (toNext == null || toNext <= 0) return 1;
  const denom = data.xpInLevel + toNext;
  if (denom <= 0) return 1;
  return Math.min(1, Math.max(0, data.xpInLevel / denom));
}
