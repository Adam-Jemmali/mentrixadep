"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);

  useEffect(() => {
    const err = new URL(window.location.href).searchParams.get("error");
    if (err === "expired") {
      setError("That reset link has expired. Please request a new password reset email.");
    }
  }, []);

  useEffect(() => {
    if (!success) return;
    setSecondsLeft(20 * 60);
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [success]);

  const timerLabel = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (resetError) {
        const isRateLimited =
          resetError.message?.includes("429") ||
          resetError.message?.toLowerCase().includes("too many");
        setError(
          isRateLimited
            ? "Too many reset attempts. Please wait a few minutes and try again."
            : resetError.message
        );
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimited = msg.includes("429") || msg.toLowerCase().includes("too many");
      setError(
        isRateLimited
          ? "Too many reset attempts. Please wait a few minutes and try again."
          : msg || "Something went wrong"
      );
    }
    setLoading(false);
  }

  async function handleResend() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) {
        const isRateLimited =
          resetError.message?.includes("429") ||
          resetError.message?.toLowerCase().includes("too many");
        setError(
          isRateLimited
            ? "Too many reset attempts. Please wait a few minutes and try again."
            : resetError.message
        );
      } else {
        setSecondsLeft(20 * 60);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimited = msg.includes("429") || msg.toLowerCase().includes("too many");
      setError(
        isRateLimited
          ? "Too many reset attempts. Please wait a few minutes and try again."
          : msg || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-brand-600" aria-hidden />
            </div>
            <h2 className="font-display font-bold text-xl text-text-primary text-center">
              Check your email
            </h2>
            <p className="text-sm text-text-muted text-center">
              We sent a password reset link to <strong className="text-text-primary">{email}</strong>. Click the link to set a new password.
            </p>
            <p className="text-xs text-text-muted text-center">
              Reset link target validity window: 20 minutes (countdown: {timerLabel})
            </p>
            <p className="text-xs text-text-muted text-center">
              Use only the newest reset email. Requesting a new one invalidates previous links.
            </p>
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-destructive text-sm font-medium text-center">{error}</p>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full py-3"
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? "Resending…" : "Resend reset email"}
            </Button>
            <Button asChild className="w-full btn-primary py-3">
              <Link href="/auth/signin">
                Back to Sign in
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Link>
            </Button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <h2 className="font-display font-bold text-2xl text-text-primary mb-1">
          Forgot password?
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="sr-only">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" aria-hidden />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base pl-11 h-11"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </motion.div>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Remember your password?{" "}
          <Link href="/auth/signin" className="text-brand-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
