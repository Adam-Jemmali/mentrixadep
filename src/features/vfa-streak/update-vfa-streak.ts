import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { invalidateStudentHubCache } from "@/features/student-profile/hub-snapshot";
import {
  applyVfaStreakOnSuccessfulInsert,
  calendarDateInTimeZone,
  vfaStreakMilestoneSubtitle,
  vfaStreakMilestoneTitle,
} from "@/features/vfa-streak/vfa-streak-pure";

/** After a successful verified_first_attempts insert — once per local day. */
export async function updateVfaStreakAfterSuccessfulInsert(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("user_settings")
    .select("timezone, vfa_streak_days, vfa_streak_last_date, vfa_streak_longest")
    .eq("user_id", userId)
    .maybeSingle();

  const timeZone =
    typeof settings?.timezone === "string" && settings.timezone.trim()
      ? settings.timezone
      : "UTC";
  const today = calendarDateInTimeZone(new Date(), timeZone);

  const next = applyVfaStreakOnSuccessfulInsert(
    {
      streakDays: Number(settings?.vfa_streak_days ?? 0),
      lastDate:
        typeof settings?.vfa_streak_last_date === "string"
          ? settings.vfa_streak_last_date
          : null,
      longest: Number(settings?.vfa_streak_longest ?? 0),
    },
    today,
  );

  if (!next.changed) return;

  if (settings) {
    const { error } = await admin
      .from("user_settings")
      .update({
        vfa_streak_days: next.streakDays,
        vfa_streak_last_date: next.lastDate,
        vfa_streak_longest: next.longest,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[updateVfaStreakAfterSuccessfulInsert]", error.message);
      return;
    }
  } else {
    const { error } = await admin.from("user_settings").insert({
      user_id: userId,
      timezone: timeZone,
      vfa_streak_days: next.streakDays,
      vfa_streak_last_date: next.lastDate,
      vfa_streak_longest: next.longest,
    });

    if (error) {
      console.error("[updateVfaStreakAfterSuccessfulInsert]", error.message);
      return;
    }
  }

  void invalidateStudentHubCache(userId);

  if (next.milestone == null) return;

  const { data: existing } = await admin
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_type", "vfa_streak_milestone")
    .eq("to_level", next.milestone)
    .maybeSingle();

  if (existing) return;

  const title = vfaStreakMilestoneTitle(next.milestone);
  const { error: achError } = await admin.from("user_achievements").insert({
    user_id: userId,
    achievement_type: "vfa_streak_milestone",
    from_level: null,
    to_level: next.milestone,
    title,
    meta: {
      days: next.milestone,
      subtitle: vfaStreakMilestoneSubtitle(),
    },
  });

  if (achError) {
    console.error("[updateVfaStreakAfterSuccessfulInsert] milestone", achError.message);
  }
}
