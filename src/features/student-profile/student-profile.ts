"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getAccountLevelFromTotalXp, getDivisionTierFromXp } from "@/features/xp/levels";
import { parseUUID } from "@/shared/core/security";
import { updateUserSettings, type UserSettings } from "@/features/settings/user-settings";
import type {
  StudentProfileAchievement,
  StudentProfileData,
  StudentProfileDivisionBadge,
  StudentProfileViewer,
} from "@/features/student-profile/student-profile-lib";
import { ensureRankCardUsername } from "@/features/rank-card/ensure-username";
import { buildRankCardSubjects } from "@/features/rank-card/build-rank-card";
import {
  buildPassportVerdict,
  passportVerdictPlainText,
} from "@/features/rank-card/rank-passport-pure";
import { getApCalcVerifiedRankStats } from "@/features/xp/calibrated-rank";
import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { filterArenaDivisions } from "@/features/divisions/ap-calc-ab-division";
import { loadProfileBattleLog } from "@/features/student-profile/load-profile-battle-log";

export type {
  StudentProfileAchievement,
  StudentProfileData,
  StudentProfileDivisionBadge,
  StudentProfileViewer,
};
const studentProfileUpdateSchema = z.object({
  display_name: z.string().max(100),
  bio: z.string().max(280),
  timezone: z.string().min(1).max(64),
  profile_visible_to_tutors: z.boolean(),
  duel_opt_in: z.boolean(),
  rank_card_public: z.boolean(),
  focused_division_key: z.string().max(64),
  email_session_reminders: z.boolean(),
  email_session_booked: z.boolean(),
  email_session_cancelled: z.boolean(),
  email_weekly_summary: z.boolean(),
  email_marketing: z.boolean(),
});

function canAccessProfile(opts: {
  profileVisible: boolean;
  viewerId: string | null;
  viewerRole: string | null;
  viewerApproved: boolean;
  studentId: string;
}): "owner" | "admin" | "public" | null {
  const { profileVisible, viewerId, viewerRole, viewerApproved, studentId } = opts;
  if (viewerId === studentId) return "owner";
  if (viewerRole === "admin" && viewerApproved) return "admin";
  if (!profileVisible) return null;
  if (!viewerId) return "public";
  if (!viewerApproved) return null;
  return "public";
}

/**
 * Loads student profile data for /student/[studentId].
 * Returns null if the student does not exist or the viewer is not allowed to see this profile.
 */
export async function getStudentProfile(studentId: string): Promise<StudentProfileData | null> {
  const parsed = parseUUID(studentId);
  if (!parsed.ok) return null;

  const admin = createAdminClient();
  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("id, role, approved, created_at")
    .eq("id", parsed.id)
    .maybeSingle();

  if (userErr || !userRow || userRow.role !== "student" || !userRow.approved) {
    return null;
  }

  const viewer = await getCurrentUser();
  const viewerId = viewer?.id ?? null;
  const viewerRole = viewer?.role ?? null;
  const viewerApproved = viewer?.approved ?? false;

  const { data: settingsRow } = await admin
    .from("user_settings")
    .select("*")
    .eq("user_id", parsed.id)
    .maybeSingle();

  const profileVisible =
    (settingsRow as { profile_visible_to_tutors?: boolean } | null)?.profile_visible_to_tutors !== false;

  const access = canAccessProfile({
    profileVisible,
    viewerId,
    viewerRole,
    viewerApproved,
    studentId: parsed.id,
  });

  if (access === null) return null;

  const { data: authStudent } = await admin.auth.admin.getUserById(parsed.id);
  const email = authStudent?.user?.email ?? "";
  const emailPrefix = email.split("@")[0] || "learner";

  const displayName =
    (typeof settingsRow?.display_name === "string" && settingsRow.display_name.trim()
      ? settingsRow.display_name.trim()
      : emailPrefix) || "Learner";

  const bio =
    typeof (settingsRow as { bio?: string | null })?.bio === "string"
      ? (settingsRow as { bio: string }).bio.trim() || null
      : null;

  const avatarUrl =
    typeof (settingsRow as { avatar_url?: string | null })?.avatar_url === "string" &&
    (settingsRow as { avatar_url: string }).avatar_url.length > 0
      ? (settingsRow as { avatar_url: string }).avatar_url
      : null;

  const timezone = (settingsRow?.timezone as string | undefined)?.trim() || "UTC";

  const [{ data: xpRow }, { data: courseRows }, { count: completedCount }, { data: divRows }, recentAchievements] =
    await Promise.all([
      admin.from("user_xp").select("total_xp, streak_days, division_xp").eq("user_id", parsed.id).maybeSingle(),
      admin.from("student_courses").select("course_name").eq("student_id", parsed.id),
      admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", parsed.id)
        .or("status.eq.completed,completed.eq.true"),
      admin.from("divisions").select("key, name").eq("active", true),
      loadProfileBattleLog(parsed.id),
    ]);

  const totalXp = xpRow?.total_xp ?? 0;
  const streakDays = xpRow?.streak_days ?? 0;
  const account = getAccountLevelFromTotalXp(totalXp);

  const divisionXp = (xpRow?.division_xp as Record<string, number> | undefined) ?? {};
  const divisionNameByKey = new Map((divRows ?? []).map((d) => [d.key, d.name]));

  const divisionBadges: StudentProfileDivisionBadge[] = Object.entries(divisionXp)
    .filter(([, xp]) => xp > 0)
    .map(([key, xp]) => {
      const divLevel = getDivisionTierFromXp(xp);
      return {
        key,
        name: divisionNameByKey.get(key) ?? key,
        xp,
        tier: divLevel.tier,
        tierLabel: divLevel.label,
      };
    })
    .sort((a, b) => b.xp - a.xp);

  const courses = (courseRows ?? [])
    .map((c) => c.course_name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  let rankCardUsername =
    typeof (settingsRow as { rank_card_username?: string | null })?.rank_card_username === "string"
      ? (settingsRow as { rank_card_username: string }).rank_card_username
      : null;
  let rankCardPublic =
    (settingsRow as { rank_card_public?: boolean })?.rank_card_public !== false;

  if (access === "owner") {
    const ensured = await ensureRankCardUsername(parsed.id, displayName);
    if (ensured) rankCardUsername = ensured;
  }

  let privateSettings: UserSettings | null = null;
  if (access === "owner") {
    privateSettings = {
      display_name: settingsRow?.display_name ?? null,
      bio,
      profile_visible_to_tutors: profileVisible,
      avatar_url: avatarUrl,
      timezone,
      email_session_reminders: settingsRow?.email_session_reminders !== false,
      email_session_booked: settingsRow?.email_session_booked !== false,
      email_session_cancelled: settingsRow?.email_session_cancelled !== false,
      email_weekly_summary: settingsRow?.email_weekly_summary === true,
      email_marketing: settingsRow?.email_marketing === true,
      session_default_duration: settingsRow?.session_default_duration ?? 60,
      session_buffer_minutes: settingsRow?.session_buffer_minutes ?? 15,
      focused_division_key:
        typeof settingsRow?.focused_division_key === "string"
          ? settingsRow.focused_division_key
          : null,
      duel_opt_in: settingsRow?.duel_opt_in === true,
      rank_card_username: rankCardUsername,
      rank_card_public: rankCardPublic,
    };
  }

  const divisions = filterArenaDivisions(divRows ?? []).map((d) => ({
    key: d.key,
    name: d.name,
  }));

  let rankCardTopSubject: string | null = courses[0] ?? null;
  let rankCardTopAccuracy = 0;
  let rankCardPassportVerdict: string | null = null;
  let rankCardCalibratedTitle: string | null = null;
  let rankCardCalibratedLevel: number | null = null;
  const verifiedStats = await getApCalcVerifiedRankStats(parsed.id).catch(() => ({
    verifiedCount: 0,
    accuracyPercent: 0,
    percentile: null,
  }));
  const passportRank = rankFromTotalXp(totalXp);
  rankCardCalibratedTitle = passportRank.title;
  rankCardCalibratedLevel = passportRank.level;
  rankCardPassportVerdict = passportVerdictPlainText(
    buildPassportVerdict({
      verifiedCount: verifiedStats.verifiedCount,
      percentile: verifiedStats.percentile,
    }),
  );
  if (access === "owner") {
    const subjects = await buildRankCardSubjects(parsed.id, totalXp);
    if (subjects[0]) {
      rankCardTopSubject = subjects[0].subject;
      rankCardTopAccuracy = subjects[0].currentAccuracy;
    }
  }

  const out: StudentProfileData = {
    studentId: parsed.id,
    viewer: access,
    displayName,
    bio,
    avatarUrl,
    memberSince: userRow.created_at,
    timezone,
    profileVisibleToTutors: profileVisible,
    totalXp,
    streakDays,
    accountLevel: account.level,
    levelLabel: account.title,
    xpInLevel: account.xpIntoLevel,
    xpToNextLevel: account.xpToNextLevel,
    nextLevelThreshold: account.nextLevelAt,
    courses,
    completedSessionsCount: completedCount ?? 0,
    divisionBadges,
    recentAchievements,
    privateSettings,
    emailPrefix,
    divisions,
    rankCardUsername,
    rankCardPublic,
    rankCardTopSubject,
    rankCardTopAccuracy,
    rankCardPassportVerdict,
    rankCardCalibratedTitle,
    rankCardCalibratedLevel,
    verifiedSkillCount: verifiedStats.verifiedCount,
  };
  return out;
}

export type UpdateStudentProfileResult = { success: true } | { success: false; error: string };

export async function updateStudentProfile(
  raw: z.infer<typeof studentProfileUpdateSchema>,
): Promise<UpdateStudentProfileResult> {
  const parsed = studentProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { requireRole } = await import("@/shared/core/auth");
  const me = await requireRole(["student"]);
  const v = parsed.data;
  const nameTrim = v.display_name.trim().slice(0, 100);
  const bioTrimmed = v.bio.trim().slice(0, 280);
  try {
    await updateUserSettings({
      display_name: nameTrim ? nameTrim : null,
      bio: bioTrimmed ? bioTrimmed : null,
      timezone: v.timezone,
      profile_visible_to_tutors: v.profile_visible_to_tutors,
      duel_opt_in: v.duel_opt_in,
      rank_card_public: v.rank_card_public,
      focused_division_key: v.focused_division_key.trim()
        ? v.focused_division_key.trim().slice(0, 64)
        : null,
      email_session_reminders: v.email_session_reminders,
      email_session_booked: v.email_session_booked,
      email_session_cancelled: v.email_session_cancelled,
      email_weekly_summary: v.email_weekly_summary,
      email_marketing: v.email_marketing,
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save" };
  }

  revalidatePath(`/student/${me.id}`);
  revalidatePath("/", "layout");
  return { success: true };
}

const avatarUrlSchema = z.string().url().max(2048);

export async function updateStudentAvatarUrl(
  rawUrl: unknown,
): Promise<UpdateStudentProfileResult> {
  const parsed = avatarUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { success: false, error: "Invalid image URL" };
  }
  const url = parsed.data;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.startsWith(supabaseUrl) && !url.includes("/storage/v1/object/public/profile-pics/")) {
    return { success: false, error: "URL must be from this app’s storage" };
  }

  const { requireRole } = await import("@/shared/core/auth");
  const me = await requireRole(["student"]);
  try {
    await updateUserSettings({ avatar_url: url });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save avatar" };
  }
  revalidatePath(`/student/${me.id}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function clearStudentAvatar(): Promise<UpdateStudentProfileResult> {
  const { requireRole } = await import("@/shared/core/auth");
  const me = await requireRole(["student"]);
  try {
    await updateUserSettings({ avatar_url: null });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to clear avatar" };
  }
  revalidatePath(`/student/${me.id}`);
  revalidatePath("/", "layout");
  return { success: true };
}