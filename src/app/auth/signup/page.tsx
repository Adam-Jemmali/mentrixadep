"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { gsap } from "gsap";

type UserRole = "student" | "tutor";

const ROLES: { type: UserRole; title: string }[] = [
  { type: "student", title: "I want to learn" },
  { type: "tutor", title: "I want to teach" },
];

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [signedUpWithSession, setSignedUpWithSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>("student");
  const [password, setPassword] = useState("");

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

  const strengthScore = useMemo(() => {
    let score = 0;
    if (password.length > 7) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strength = useMemo(() => {
    switch (strengthScore) {
      case 1:
        return { label: "Weak", width: "25%", color: "bg-red-400" };
      case 2:
        return { label: "Fair", width: "50%", color: "bg-amber-400" };
      case 3:
        return { label: "Good", width: "75%", color: "bg-blue-400" };
      case 4:
        return { label: "Strong", width: "100%", color: "bg-green-500" };
      default:
        return { label: "", width: "0%", color: "bg-transparent" };
    }
  }, [strengthScore]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const passInput = form.elements.namedItem("password") as HTMLInputElement;
    const confirmInput = form.elements.namedItem("confirmPassword") as HTMLInputElement;
    const emailVal = emailInput?.value?.trim().toLowerCase() ?? "";
    const passVal = passInput?.value ?? "";
    const confirmVal = confirmInput?.value ?? "";

    if (!emailVal.includes("@") || emailVal.length < 5) {
      setError("Please enter a valid email address.");
      return;
    }
    if (passVal.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (passVal !== confirmVal) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setSignedUpEmail(null);
    setSignedUpWithSession(false);

    try {
      // Sign up in the browser so Supabase can set auth cookies reliably (server actions often fail here).
      const supabase = createClient();
      const origin = window.location.origin;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailVal,
        password: passVal,
        options: {
          data: { role },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSignedUpEmail(data.user?.email ?? emailVal);
      setSignedUpWithSession(!!data.session);
      setSuccess(true);
      if (data.session) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="rounded-2xl border-2 border-mentrixa-300 bg-gradient-to-b from-mentrixa-50 to-white px-5 py-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mentrixa-700 mb-2">
            Next step
          </p>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-slate-900 mb-4">
            Please check your email
          </h1>
          <p className="text-base text-slate-800 leading-relaxed font-medium">
            Look at your inbox for{" "}
            <span className="text-slate-950 underline decoration-mentrixa-400 decoration-2 underline-offset-2 break-all">
              {signedUpEmail ?? "the email you signed up with"}
            </span>
            . Open our message and tap the link to confirm your account.
          </p>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            If you don’t see it in a minute, check your spam folder. After you confirm, an admin may
            still need to approve your account before you can sign in.
          </p>
        </div>

        {signedUpWithSession && (
          <Button type="button" className="w-full" onClick={() => router.replace("/pending-approval")}>
            Continue (you’re signed in on this device)
          </Button>
        )}

        <Button asChild variant="outline" className="w-full border-slate-300">
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 mb-1">
        Create your account
      </h1>
      <p className="text-sm text-slate-500 mb-5">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-mentrixa-600 hover:underline">
          Sign in
        </Link>
      </p>

      <GoogleSignInButton flow="signup" />

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
          <Input id="email" name="email" type="email" placeholder="you@university.ca" required className="input-premium border-slate-200 transition-all duration-200" />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            autoComplete="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input-premium border-slate-200 transition-all duration-200"
          />
          <div className="mt-2 w-full h-[3px] bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
              style={{ width: strength.width }}
            />
          </div>
          {strength.label && (
            <div className="mt-1 text-xs text-slate-400">
              {strength.label}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="input-premium border-slate-200 transition-all duration-200"
          />
        </div>

        <div className="mt-5 space-y-2">
          {ROLES.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setRole(item.type)}
              className={
                role === item.type
                  ? "w-full h-12 border-2 border-mentrixa-600 bg-mentrixa-50 text-mentrixa-700 font-semibold rounded-md text-[14px] transition-all duration-100"
                  : "w-full h-12 border border-[#E2E8F0] bg-white text-[#64748B] font-medium rounded-md text-[14px] transition-all duration-100"
              }
            >
              {item.title}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-4" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </Button>

        <p className="text-xs text-slate-400 text-center mt-2">
          By signing up you agree to our Terms of Service.
        </p>
      </form>
    </>
  );
}
