import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/database.types";
import { getRoleHomePath } from "@/lib/role-home";

export interface AuthUser {
  id: string;
  role: UserRole;
  approved: boolean;
  email?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use JWT metadata instead of database query for better scalability
  // This avoids hitting the database on every request
  const role = user.user_metadata?.role as UserRole | undefined;
  const approved = user.user_metadata?.approved === true || user.user_metadata?.approved === "true";

  // Fallback to database query only if JWT metadata is missing (shouldn't happen in production)
  if (!role || approved === undefined) {
    const { data: userData } = await supabase
      .from("users")
      .select("role, approved")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.approved) {
      return null;
    }

    return {
      id: user.id,
      role: userData.role as UserRole,
      approved: userData.approved,
      email: user.email,
    };
  }

  if (!approved) {
    return null;
  }

  return {
    id: user.id,
    role: role,
    approved: approved,
    email: user.email,
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
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!allowedRoles.includes(user.role)) {
    redirect(getRoleHomePath(user.role));
  }
  return user;
}

