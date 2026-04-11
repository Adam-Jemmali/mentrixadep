"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type WaitlistRole = "student" | "tutor";

export function WaitlistJoinForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole>("student");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setMsg(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMsg("Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        approved?: boolean;
        error?: string;
        message?: string;
        status?: "pending" | "approved" | "rejected";
      };

      if (!res.ok) {
        if (json.status === "pending") {
          setMsg("You have already applied to the waitlist. Please wait for an admin decision.");
        } else if (json.status === "rejected") {
          setMsg("Your waitlist application was rejected. Contact support@mentrixa.one if you believe this is a mistake.");
        } else {
          setMsg(json.error ?? "Could not join waitlist. Please try again.");
        }
      } else if (json.approved) {
        setMsg("✓ You are already approved! You can now sign in with your credentials.");
      } else {
        setMsg("✓ Success! Check your email for confirmation. We'll notify you once you're approved.");
      }
      setEmail("");
    } catch (err) {
      setMsg("Could not join waitlist. Please try again.");
      console.error("Waitlist error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.ca or personal email"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-mentrixa-500 focus:ring-1 focus:ring-mentrixa-500"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">I want to be a</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole("student")}
              disabled={loading}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                role === "student"
                  ? "bg-mentrixa-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <span className="h-4 w-4">👤</span>
              Mentrixer (Student)
            </button>
            <button
              type="button"
              onClick={() => setRole("tutor")}
              disabled={loading}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                role === "tutor"
                  ? "bg-mentrixa-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <span className="h-4 w-4">🎓</span>
              Guide (Tutor)
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || !email.trim()}
          className="w-full inline-flex items-center justify-center rounded-lg bg-mentrixa-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-mentrixa-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Submitting..." : "Join Waitlist"}
        </button>

        {/* Message */}
        {msg && (
          <div
            className={cn(
              "rounded-lg p-3 text-sm",
              msg.startsWith("✓")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            )}
            role="alert"
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
