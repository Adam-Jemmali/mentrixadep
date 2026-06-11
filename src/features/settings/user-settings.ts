"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { deleteRegistrationRequestsByIdentityEmail } from "@/features/registration/delete-registration-requests-by-email";
import { getSiteUrl } from "@/shared/core/site";
import { assertNoBlockedLanguage } from "@/shared/core/security";
import { isValidRankCardUsername } from "@/features/rank-card/username";
import { ensureRankCardUsername } from "@/features/rank-card/ensure-username";

export interface UserSettings {
  display_name: string | null;
  bio: string | null;
  profile_visible_to_tutors: boolean;
  avatar_url: string | null;
  timezone: string;
  email_session_reminders: boolean;
  email_session_booked: boolean;
  email_session_cancelled: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  session_default_duration: number;
  session_buffer_minutes: number;
  /** Student: leaderboard focus (optional) */
  focused_division_key: string | null;
  /** Student: allow peer skill duel challenges */
  duel_opt_in: boolean;
  /** Public Rank Card slug (mentrixa.one/rank/[username]) */
  rank_card_username: string | null;
  /** When false, Rank Card URL shows private notice */
  rank_card_public: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  display_name: null,
  bio: null,
  profile_visible_to_tutors: true,
  avatar_url: null,
  timezone: "UTC",
  email_session_reminders: true,
  email_session_booked: true,
  email_session_cancelled: true,
  email_weekly_summary: false,
  email_marketing: false,
  session_default_duration: 60,
  session_buffer_minutes: 15,
  focused_division_key: null,
  duel_opt_in: false,
  rank_card_username: null,
  rank_card_public: true,
};

export async function getUserSettings(): Promise<UserSettings> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return { ...DEFAULT_SETTINGS };

  return {
    display_name: data.display_name ?? null,
    bio: typeof (data as { bio?: unknown }).bio === "string" ? (data as { bio: string }).bio : null,
    profile_visible_to_tutors:
      (data as { profile_visible_to_tutors?: boolean }).profile_visible_to_tutors !== false,
    avatar_url:
      typeof (data as { avatar_url?: unknown }).avatar_url === "string"
        ? (data as { avatar_url: string }).avatar_url
        : null,
    timezone: data.timezone ?? "UTC",
    email_session_reminders: data.email_session_reminders ?? true,
    email_session_booked: data.email_session_booked ?? true,
    email_session_cancelled: data.email_session_cancelled ?? true,
    email_weekly_summary: data.email_weekly_summary ?? false,
    email_marketing: data.email_marketing ?? false,
    session_default_duration: data.session_default_duration ?? 60,
    session_buffer_minutes: data.session_buffer_minutes ?? 15,
    focused_division_key:
      typeof data.focused_division_key === "string"
        ? data.focused_division_key
        : null,
    duel_opt_in: data.duel_opt_in === true,
    rank_card_username:
      typeof (data as { rank_card_username?: unknown }).rank_card_username === "string"
        ? (data as { rank_card_username: string }).rank_card_username
        : null,
    rank_card_public:
      (data as { rank_card_public?: boolean }).rank_card_public !== false,
  };
}

import { userSettingsSchema } from "@/shared/core/schemas";

export async function updateUserSettings(settings: Partial<UserSettings>) {
  const user = await requireAuth();
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  // M-02: Use strict whitelisting with Zod to prevent mass assignment.
  const validated = userSettingsSchema.partial().safeParse(settings);
  if (!validated.success) {
    throw new Error("Invalid settings provided.");
  }
  
  const payload: Record<string, unknown> = { 
    ...validated.data,
    updated_at: new Date().toISOString() 
  };

  // Additional business logic/sanitization if needed (e.g. avatar URL domain check)
  if (validated.data.avatar_url) {
    const u = validated.data.avatar_url;
    if (
      !supabaseUrl ||
      !u.startsWith(supabaseUrl) ||
      !u.includes("/storage/v1/object/public/profile-pics/")
    ) {
      throw new Error("Avatar must use the app's profile-pics storage bucket");
    }
    assertNoBlockedLanguage(u, "avatar");
  }

  if (typeof validated.data.display_name === "string") {
    assertNoBlockedLanguage(validated.data.display_name, "display name");
  }

  if (typeof validated.data.bio === "string") {
    assertNoBlockedLanguage(validated.data.bio, "bio");
  }

  if (validated.data.rank_card_username !== undefined && validated.data.rank_card_username !== null) {
    const slug = validated.data.rank_card_username.toLowerCase();
    if (!isValidRankCardUsername(slug)) {
      throw new Error("Rank Card username must be 3–30 characters (lowercase letters, numbers, hyphens).");
    }
    payload.rank_card_username = slug;
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });

  if (error) {
    throw new Error("Failed to save settings");
  }

  if (validated.data.display_name !== undefined) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: validated.data.display_name },
    });

    if (user.role === "student" && validated.data.display_name) {
      await ensureRankCardUsername(user.id, validated.data.display_name);
    }
  }

  const rankSlug =
    typeof payload.rank_card_username === "string"
      ? payload.rank_card_username
      : validated.data.rank_card_username;
  if (typeof rankSlug === "string" && rankSlug) {
    revalidatePath(`/rank/${rankSlug}`);
  }

  revalidatePath("/settings");
  revalidatePath("/student/division");
  revalidatePath("/student/duel");
  revalidatePath(`/student/${user.id}`);
  revalidatePath("/", "layout");
  if (user.role === "tutor") {
    revalidatePath(`/tutor/${user.id}`);
  }
  return { success: true };
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const user = await requireAuth();
  const supabase = await createClient();

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (newPassword.length > 128) {
    throw new Error("Password is too long");
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error("Current password is incorrect");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error("Failed to update password");
  }

  return { success: true };
}

export async function deleteAccount() {
  const user = await requireAuth();
  const adminClient = createAdminClient();

  if (user.email) {
    await deleteRegistrationRequestsByIdentityEmail(adminClient, user.email);
  }

  // Ensure app profile row is removed.
  await adminClient.from("users").delete().eq("id", user.id);

  const { error } = await adminClient.auth.admin.deleteUser(user.id, false);
  if (error) {
    throw new Error(error.message || "Failed to delete account");
  }

  // Best-effort cleanup for current browser session cookie after auth deletion.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore: auth record is already deleted.
  }

  /** Full navigation — avoids RSC refetch of the current page after the user row is gone (prod error #441). */
  redirect(getSiteUrl(), "replace");
}
