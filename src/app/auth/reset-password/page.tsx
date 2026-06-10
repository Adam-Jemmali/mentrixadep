"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AuthLayout } from "@/features/auth/ui/AuthLayout";
import { AuthCard } from "@/features/auth/ui/AuthCard";
import { motion } from "framer-motion";
import { createClient } from "@/shared/integrations/supabase/client";
import { getRoleHomePath } from "@/shared/core/role-home";

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
  const [activating, setActivating] = useState(false);
  const [gatePrimed, setGatePrimed] = useState(false);
  const [activationPayload, setActivationPayload] = useState<
    | { kind: "code"; value: string }
    | { kind: "token_hash"; value: string }
    | { kind: "hash_session"; accessToken: string; refreshToken: string }
    | null
  >(null);
  // true = waiting for the recovery session to be established from URL hash tokens
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
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
    const hashAccessToken = hashParams.get("access_token");
    const hashRefreshToken = hashParams.get("refresh_token");

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

    const candidateCode = queryCode ?? hashCode;
    const candidateType = queryType ?? hashType;
    const candidateTokenHash = queryTokenHash ?? hashTokenHash;
    if (candidateCode) {
      setActivationPayload({ kind: "code", value: candidateCode });
      setSessionChecking(false);
      return;
    }
    if (candidateTokenHash && isRecoveryType(candidateType)) {
      setActivationPayload({ kind: "token_hash", value: candidateTokenHash });
      setSessionChecking(false);
      return;
    }
    if (hashAccessToken && hashRefreshToken && isRecoveryType(candidateType)) {
      setActivationPayload({
        kind: "hash_session",
        accessToken: hashAccessToken,
        refreshToken: hashRefreshToken,
      });
      setSessionChecking(false);
      return;
    }

    // If URL has no recovery payload, allow users who already have a valid recovery session.
    const bootstrapExistingSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setError("No reset token was found. Please request a new reset email.");
      }
      setSessionChecking(false);
    };
    void bootstrapExistingSession();
  }, []);

  async function activateResetLink() {
    if (!activationPayload) return;
    const gateAtRaw = sessionStorage.getItem("mx_reset_human_gate_at");
    const gateAt = gateAtRaw ? Number(gateAtRaw) : 0;
    const gateFresh = Number.isFinite(gateAt) && gateAt > 0 && Date.now() - gateAt <= 10 * 60 * 1000;
    if (!gateFresh && !gatePrimed) {
      sessionStorage.setItem("mx_reset_human_gate_at", String(Date.now()));
      setGatePrimed(true);
      setError(null);
      return;
    }

    setActivating(true);
    setError(null);
    try {
      const supabase = createClient();
      if (activationPayload.kind === "code") {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(activationPayload.value);
        if (exchangeError) {
          setError("Your reset link is invalid or expired. Please request a new one.");
          return;
        }
      } else if (activationPayload.kind === "token_hash") {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: activationPayload.value,
          type: "recovery",
        });
        if (otpError) {
          setError("Your reset link is invalid or expired. Please request a new one.");
          return;
        }
      } else {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: activationPayload.accessToken,
          refresh_token: activationPayload.refreshToken,
        });
        if (sessionError) {
          setError("Your reset link is invalid or expired. Please request a new one.");
          return;
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Could not establish a reset session. Please request a new link.");
        return;
      }

      // Latest-link-only guard: reject if user metadata indicates a newer reset request.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const latestRid = String(user?.user_metadata?.password_reset_rid ?? "");
      const incomingRid = new URL(window.location.href).searchParams.get("rid") ?? "";
      if (incomingRid && latestRid && incomingRid !== latestRid) {
        await supabase.auth.signOut();
        setSessionReady(false);
        setError("This reset link is no longer current. Please use the latest reset email.");
        return;
      }
      setSessionReady(true);
      setActivationPayload(null);
    } finally {
      setActivating(false);
    }
  }

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
        ) : activationPayload && !sessionReady ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              For security, click below to activate your reset link, then set your new password.
            </p>
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}
            <Button
              type="button"
              className="btn-primary w-full py-3 text-base"
              onClick={activateResetLink}
              disabled={activating}
            >
              {activating ? "Activating…" : gatePrimed ? "Click once more to confirm" : "Continue to reset password"}
            </Button>
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
                {(error.includes("expired") || error.includes("invalid")) && (
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
          <Link href="/auth/signin?signin=1" className="text-brand-600 hover:underline font-medium">
            Back to Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

