"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { WaitlistRole } from "@/lib/waitlist-role";

const ICON_VERSION = "20260410";

export function WaitlistJoinForm({
  initialEmail = "",
  initialRole = "student",
}: {
  initialEmail?: string;
  /** Defaults to Mentrixer (student) when omitted. */
  initialRole?: WaitlistRole;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<WaitlistRole>(() => initialRole);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);
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
          setMsg(
            `Your ${role === "tutor" ? "Guide" : "Mentrixer"} access request is already pending review.`,
          );
        } else if (json.status === "rejected") {
          setMsg(
            `Your ${role === "tutor" ? "Guide" : "Mentrixer"} access request was not approved. Contact support@mentrixa.one if this seems incorrect.`,
          );
        } else {
          setMsg(json.error ?? "Could not start access request. Please try again.");
        }
      } else if (json.approved) {
        setMsg(
          `✓ You are already approved as a ${role === "tutor" ? "Guide" : "Mentrixer"}. Continue to sign in or create your account.`,
        );
      } else {
        setMsg(
          `✓ You're in onboarding as a ${role === "tutor" ? "Guide" : "Mentrixer"}. Check your email for confirmation.`,
        );
      }
      setEmail("");
    } catch (err) {
      setMsg("Could not start access request. Please try again.");
      console.error("Access request error:", err);
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
              <Image
                src={`/icons/mentrixer.svg?v=${ICON_VERSION}`}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 shrink-0"
              />
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
              <Image
                src={`/icons/guide.svg?v=${ICON_VERSION}`}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 shrink-0"
              />
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
          {loading ? "Submitting..." : "Get Instant Access"}
        </button>

        {/* Message */}
        {msg && (
          <div
            className={cn(
              "rounded-lg p-3 text-sm",
              msg.startsWith("✓")
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : "bg-slate-50 text-slate-800 border border-slate-200"
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
