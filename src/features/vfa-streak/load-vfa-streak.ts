import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  calendarDateInTimeZone,
  resolveVfaStreakHomeDisplay,
  type VfaStreakHomeDisplay,
} from "@/features/vfa-streak/vfa-streak-pure";

export async function loadVfaStreakHomeDisplay(userId: string): Promise<VfaStreakHomeDisplay> {
  const snapshot = await loadVfaStreakSnapshot(userId);
  return snapshot.display;
}

export async function loadVfaStreakSnapshot(userId: string): Promise<{
  display: VfaStreakHomeDisplay;
  longest: number;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("timezone, vfa_streak_days, vfa_streak_last_date, vfa_streak_longest")
    .eq("user_id", userId)
    .maybeSingle();

  const timeZone =
    typeof data?.timezone === "string" && data.timezone.trim() ? data.timezone : "UTC";
  const today = calendarDateInTimeZone(new Date(), timeZone);
  const longest = Number(data?.vfa_streak_longest ?? 0);

  return {
    display: resolveVfaStreakHomeDisplay(
      {
        streakDays: Number(data?.vfa_streak_days ?? 0),
        lastDate:
          typeof data?.vfa_streak_last_date === "string" ? data.vfa_streak_last_date : null,
        longest,
      },
      today,
    ),
    longest,
  };
}
