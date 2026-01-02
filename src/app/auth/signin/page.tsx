"use client";

import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      const redirectPath = result.role === "admin" ? "/admin" : "/dashboard";
      router.push(redirectPath);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">O</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">OTAMS</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          {/* Switch mode */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'var(--gradient-dark)' }}>
        {/* Decorative elements */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8">
              <GraduationCap size={40} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Academic excellence starts here
            </h2>
            <p className="text-primary-foreground/70 leading-relaxed">
              Connect with verified experts, get personalized help, and achieve your academic goals with confidence.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-primary-foreground/10">
              <div>
                <p className="text-2xl font-bold text-primary-foreground">New</p>
                <p className="text-xs text-primary-foreground/60">Platform</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-foreground">100%</p>
                <p className="text-xs text-primary-foreground/60">Free</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-foreground">4.9★</p>
                <p className="text-xs text-primary-foreground/60">Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
