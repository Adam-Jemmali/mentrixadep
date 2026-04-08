"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { gsap } from "gsap";
import { toUserFacingAuthError } from "@/lib/user-facing-error";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const wrapper = document.getElementById("auth-form-wrapper");
    if (!wrapper) return;
    const children = Array.from(wrapper.children);
    gsap.fromTo(
      children,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.07, duration: 0.4, ease: "power3.out" },
    );
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || !body.ok || !body.redirectTo) {
        setError(toUserFacingAuthError(body.error ?? "Sign in failed. Please try again."));
        return;
      }
      router.push(body.redirectTo);
      router.refresh();
    } catch (err) {
      setError(toUserFacingAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-md"
          aria-busy
          aria-live="polite"
        >
          <MentrixaLogoLoader size="xl" label="Signing you in" />
        </div>
      ) : null}
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 mb-1">
        Sign in
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        New to Mentrixa?{" "}
        <Link href="/auth/signup" className="text-mentrixa-600 hover:underline">
          Create an account
        </Link>
      </p>

      <GoogleSignInButton variant="signin" />

      <div className="flex items-center gap-3 my-5">
        <span className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <span className="flex-1 h-px bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@university.ca or your personal email"
            className="input-premium border-slate-200 transition-all duration-200"
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="input-premium border-slate-200 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <Link
            href="/auth/forgot-password"
            className="block mt-1.5 text-xs text-slate-400 hover:text-slate-700 text-right"
          >
            Forgot password
          </Link>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-5" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}
