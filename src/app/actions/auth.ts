"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validateRole,
  sanitizeError,
} from "@/lib/security";
import { enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/lib/rate-limit";

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const identifier = getRateLimitId(user?.id);

    // Rate limiting
    enforceRateLimit(identifier, RATE_LIMITS.signUp, "sign up");

    // Validate inputs
    const email = validateEmail(formData.get("email"));
    const password = validatePassword(formData.get("password"));
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    if (data.user) {
      const { error: regError } = await supabase
        .from("registration_requests")
        .insert({
          email: data.user.email!,
          role,
          status: "pending",
        });

      if (regError) {
        return { error: "Failed to create registration request" };
      }
    }

    return { success: true, message: "Registration request submitted. Please wait for admin approval." };
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

