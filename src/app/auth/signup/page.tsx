"use client";

import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, User, ArrowRight, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRole = "student" | "tutor";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>((roleParam === "tutor" ? "tutor" : "student") as UserRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("role", role);

    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(true);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl border border-border p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Registration Request Submitted
              </h2>
              <p className="text-muted-foreground">
                Your registration request has been submitted. Please check your email to verify your account.
                You will be able to log in once an admin approves your request.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/signin">Go to Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
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
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Join the academic marketplace
            </p>
          </div>

          {/* Role selector */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">I am a...</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === "student"
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <GraduationCap 
                  size={24} 
                  className={role === "student" ? "text-primary mx-auto mb-2" : "text-muted-foreground mx-auto mb-2"} 
                />
                <p className={`text-sm font-medium ${role === "student" ? "text-primary" : "text-foreground"}`}>
                  Student
                </p>
                <p className="text-xs text-muted-foreground mt-1">Looking for help</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("tutor")}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === "tutor"
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <BookOpen 
                  size={24} 
                  className={role === "tutor" ? "text-primary mx-auto mb-2" : "text-muted-foreground mx-auto mb-2"} 
                />
                <p className={`text-sm font-medium ${role === "tutor" ? "text-primary" : "text-foreground"}`}>
                  Provider
                </p>
                <p className="text-xs text-muted-foreground mt-1">Offering services</p>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Creating account..." : "Create Account"}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </form>

          {/* Switch mode */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary font-medium hover:underline">
              Sign in
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
