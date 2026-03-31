"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getRoleHomePath } from "@/lib/role-home";
import {
  validateEmail,
  validatePassword,
  validateRole,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = getRateLimitId(user?.id);

    // Rate limiting
    enforceRateLimit(identifier, RATE_LIMITS.signUp, "sign up");

    // Validate inputs (FormData keys must match input name="" on the signup form)
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    let email: string;
    let password: string;
    try {
      email = validateEmail(emailRaw);
      password = validatePassword(passwordRaw);
    } catch {
      return {
        error:
          "Please enter a valid email and a password of at least 8 characters. Make sure both password fields are filled in.",
      };
    }
    const role = validateRole(formData.get("role"));

    // Only allow student or tutor roles for signup
    if (role !== "student" && role !== "tutor") {
      return { error: "Invalid role" };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
      },
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    // When email confirmation is off, Supabase returns a session immediately — client should redirect
    // so middleware + layout don’t fight the signup success UI (page can appear “stuck”).
    const sessionEstablished = !!data.session;

    // DB trigger handle_new_user_with_jwt already inserts into registration_requests
    return {
      success: true,
      sessionEstablished,
      email,
      message: "Registration request submitted. Please wait for admin approval.",
    };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function signIn(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = getRateLimitId(user?.id);

    // Rate limiting
    enforceRateLimit(identifier, RATE_LIMITS.signIn, "sign in");

    // Validate inputs
    const email = validateEmail(formData.get("email"));
    const password = validatePassword(formData.get("password"));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    if (data.user) {
      // Wait a moment for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh the session to ensure auth context is available
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { error: "Session not established" };
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        await supabase.auth.signOut();
        return { error: "Invalid credentials" };
      }

      if (!userData) {
        await supabase.auth.signOut();
        return { error: "Invalid credentials" };
      }

      if (!userData.approved) {
        await supabase.auth.signOut();
        return { error: "Your account is pending admin approval. Please wait for approval before logging in." };
      }

      // Success - return success flag with role for client-side redirect
      revalidatePath("/", "layout");
      return { success: true, role: userData.role };
    }

    return { error: "Sign in failed - no user data returned" };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

/**
 * Where to send the user after Google Identity Services + signInWithIdToken succeeds.
 * Mirrors `src/app/auth/callback/route.ts` (PKCE) so both OAuth paths behave the same.
 */
export async function getPostOAuthRedirectPath(): Promise<
  { path: string } | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role, approved")
      .eq("id", user.id)
      .maybeSingle();

    const hasChosenRole = user.user_metadata?.role != null;

    if (!hasChosenRole && userData?.role === "student") {
      return { path: "/auth/select-role" };
    }

    if (!userData?.approved) {
      return { path: "/pending-approval" };
    }

    const role = userData?.role ?? user.user_metadata?.role;
    return { path: getRoleHomePath(role) };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // When called from a form or client component, callers should handle navigation.
  // We deliberately avoid redirect() here to allow flexible client-side behavior.
  return { success: true };
}

export async function setUserRole(role: "student" | "tutor") {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated" };
    }

    if (role !== "student" && role !== "tutor") {
      return { error: "Invalid role" };
    }

    // Update the users table row that the DB trigger already created
    const { error: updateError } = await supabase
      .from("users")
      .update({ role, approved: false })
      .eq("id", user.id);

    if (updateError) {
      return { error: "Failed to set role" };
    }

    // Update JWT metadata so middleware picks up the role
    await supabase.auth.updateUser({ data: { role, approved: false } });

    // Ensure a registration_requests row exists for admin review
    await supabase
      .from("registration_requests")
      .upsert(
        { email: user.email!, role, status: "pending" },
        { onConflict: "email" }
      );

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "An unexpected error occurred" };
  }
}

