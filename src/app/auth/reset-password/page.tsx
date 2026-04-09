"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getRoleHomePath } from "@/lib/role-home";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

function isRecoveryType(value: string | null): value is "recovery" {
  return value === "recovery";
}

function normalizeResetError(params: {
  errorCode: string | null;
  errorDescription: string | null;
  error: string | null;
}): string | null {
  const code = (params.errorCode ?? "").toLowerCase();
  const description = (params.errorDescription ?? "").toLowerCase();
  const err = (params.error ?? "").toLowerCase();

  if (code === "otp_expired" || description.includes("expired")) {
    return "Your reset link has expired or was already used. Request a new reset email and open only the newest link.";
  }
  if (err === "access_denied") {
    return "This reset link is invalid. Request a new reset email and try again from the latest message.";
  }
  return null;
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // true = waiting for the recovery session to be established from URL hash tokens
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : "");
    const queryType = url.searchParams.get("type");
    const queryCode = url.searchParams.get("code");
    const queryTokenHash = url.searchParams.get("token_hash");
    const queryErrorCode = url.searchParams.get("error_code");
    const queryErrorDescription = url.searchParams.get("error_description");
    const queryError = url.searchParams.get("error");
    const hashType = hashParams.get("type");
    const hashCode = hashParams.get("code");
    const hashTokenHash = hashParams.get("token_hash");
    const hashErrorCode = hashParams.get("error_code");
    const hashErrorDescription = hashParams.get("error_description");
    const hashError = hashParams.get("error");

    const normalizedError = normalizeResetError({
      errorCode: queryErrorCode ?? hashErrorCode,
      errorDescription: queryErrorDescription ?? hashErrorDescription,
      error: queryError ?? hashError,
    });
    if (normalizedError) {
      setError(normalizedError);
      setSessionChecking(false);
      return;
    }

    const bootstrap = async () => {
      // Support recovery links opened directly on /auth/reset-password
      // (code flow and token_hash flow).
      const candidateCode = queryCode ?? hashCode;
      const candidateType = queryType ?? hashType;
      const candidateTokenHash = queryTokenHash ?? hashTokenHash;

      if (candidateCode) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(candidateCode);
        if (exchangeError) {
          setError("Your reset link is invalid or expired. Please request a new one.");
          setSessionChecking(false);
          return;
        }
      } else if (candidateTokenHash && isRecoveryType(candidateType)) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: candidateTokenHash,
          type: "recovery",
        });
        if (otpError) {
          setError("Your reset link is invalid or expired. Please request a new one.");
          setSessionChecking(false);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        setSessionChecking(false);
        return;
      }
      // No session yet — wait for PASSWORD_RECOVERY event from hash tokens.
    };

    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
        setSessionChecking(false);
      }
    });

    // Session can appear shortly after route hydration; poll briefly to avoid false expiry errors.
    const poll = window.setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
        setSessionChecking(false);
        window.clearInterval(poll);
      }
    }, 700);

    // Timeout — if no session after 12s, show resilient guidance
    const timeout = setTimeout(() => {
      setSessionChecking((prev) => {
        if (prev) {
          setError(
            "Could not establish a reset session. This can happen if an older link was clicked or a mail scanner opened the link first. Request a new reset email and open only the latest link."
          );
          return false;
        }
        return prev;
      });
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session expired. Please sign in again.");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role, approved")
        .eq("id", user.id)
        .maybeSingle();

      // Sign out after reset — clean state
      await supabase.auth.signOut();

      if (!userRow?.role || userRow.approved === false) {
        router.push("/auth/signin?reset=1");
        return;
      }

      router.push(getRoleHomePath(userRow.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="font-display font-bold text-2xl text-text-primary mb-1">
          Set new password
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Enter your new password below. You were sent here from the link in your email.
        </p>

        {sessionChecking ? (
          <div className="py-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 mb-3" />
            <p className="text-sm text-text-muted">Verifying your reset link…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="sr-only">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" aria-hidden />
                <Input
                  id="new-password"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-base pl-11 pr-11 h-11"
                  required
                  minLength={8}
                  disabled={!sessionReady}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-muted"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="sr-only">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" aria-hidden />
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base pl-11 pr-11 h-11"
                  required
                  minLength={8}
                  disabled={!sessionReady}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-muted"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-destructive text-sm font-medium">{error}</p>
                {error.includes("expired") && (
                  <Link
                    href="/auth/forgot-password"
                    className="mt-2 inline-block text-sm text-brand-600 hover:underline font-medium"
                  >
                    Request a new reset link →
                  </Link>
                )}
              </div>
            )}

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="btn-primary w-full py-3 text-base"
                disabled={loading || !sessionReady}
              >
                {loading ? "Updating…" : "Update password"}
              </Button>
            </motion.div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/auth/signin" className="text-brand-600 hover:underline font-medium">
            Back to Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

