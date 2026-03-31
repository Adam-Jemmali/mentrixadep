"use server";

import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface UserSettings {
  display_name: string | null;
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
}

const DEFAULT_SETTINGS: UserSettings = {
  display_name: null,
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
  };
}

export async function updateUserSettings(settings: Partial<UserSettings>) {
  const user = await requireAuth();
  const supabase = await createClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (settings.display_name !== undefined) {
    const name = (settings.display_name ?? "").trim().slice(0, 100);
    payload.display_name = name || null;
  }

  if (settings.timezone !== undefined) {
    payload.timezone = settings.timezone;
  }

  const boolFields = [
    "email_session_reminders",
    "email_session_booked",
    "email_session_cancelled",
    "email_weekly_summary",
    "email_marketing",
  ] as const;

  for (const field of boolFields) {
    if (settings[field] !== undefined) {
      payload[field] = !!settings[field];
    }
  }

  if (settings.session_default_duration !== undefined) {
    const dur = Math.max(15, Math.min(180, settings.session_default_duration));
    payload.session_default_duration = dur;
  }

  if (settings.session_buffer_minutes !== undefined) {
    const buf = Math.max(0, Math.min(60, settings.session_buffer_minutes));
    payload.session_buffer_minutes = buf;
  }

  if (settings.focused_division_key !== undefined) {
    const v = settings.focused_division_key;
    payload.focused_division_key =
      v === null || v === "" ? null : String(v).trim().slice(0, 64);
  }

  if (settings.duel_opt_in !== undefined) {
    payload.duel_opt_in = !!settings.duel_opt_in;
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });

  if (error) {
    throw new Error("Failed to save settings");
  }

  if (payload.display_name !== undefined) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: payload.display_name },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/student/division");
  revalidatePath("/student/duel");
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

  await adminClient.from("user_settings").delete().eq("user_id", user.id);
  await adminClient.from("user_xp").delete().eq("user_id", user.id);

  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    throw new Error("Failed to delete account");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return { success: true };
}
