import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/database.types";
import { getRoleHomePath } from "@/lib/role-home";

export interface AuthUser {
  id: string;
  role: UserRole;
  approved: boolean;
  email?: string;
  /** From `user_settings`; drives navbar name + avatar */
  displayName?: string | null;
  avatarUrl?: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await loadCurrentUser();
  } catch (e) {
    console.error("[auth] getCurrentUser failed:", e);
    return null;
  }
}

async function loadCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow?.role) {
    return null;
  }

  const { data: settingsRow } = await supabase
    .from("user_settings")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    typeof settingsRow?.display_name === "string" && settingsRow.display_name.trim()
      ? settingsRow.display_name.trim()
      : null;
  const avatarUrl =
    typeof settingsRow?.avatar_url === "string" && settingsRow.avatar_url.length > 0
      ? settingsRow.avatar_url
      : null;

  return {
    id: user.id,
    role: userRow.role as UserRole,
    approved: userRow.approved,
    email: user.email,
    displayName,
    avatarUrl,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

export async function requireRole(role: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();

  // Admins are never blocked by approval checks
  if (user.role === "admin") {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role)) {
      redirect(getRoleHomePath(user.role));
    }
    return user;
  }

  if (!user.approved) {
    // Check if user has an active verification (full access during window)
    const supabase = await createClient();
    const { data: userRow } = await supabase
      .from("users")
      .select("is_blacklisted, verification_status")
      .eq("id", user.id)
      .maybeSingle();

    const activeStatuses = ["pending", "in_review", "info_requested"];
    const hasActiveVerification =
      userRow?.verification_status &&
      activeStatuses.includes(userRow.verification_status as string);
    const isBlacklisted = userRow?.is_blacklisted === true;

    if (isBlacklisted || !hasActiveVerification) {
      redirect("/pending-approval");
    }
    // Active verification: allow through (full access)
  }

  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!allowedRoles.includes(user.role)) {
    redirect(getRoleHomePath(user.role));
  }
  return user;
}
