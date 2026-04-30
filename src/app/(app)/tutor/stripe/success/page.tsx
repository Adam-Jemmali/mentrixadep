"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FinalizeResponse =
  | { ok: true; status: { payoutsEnabled: boolean; accountId: string | null; onboardingGuide: { accountReady: boolean; nextAction: string | null; disabledReason: string | null } } }
  | { ok: false; error: string };

export default function StripeSuccessPage() {
  const [state, setState] = useState<"loading" | "success" | "incomplete" | "error">("loading");
  const [message, setMessage] = useState<string>("Finalizing your Stripe connection...");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/stripe/connect/finalize", {
          method: "POST",
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as FinalizeResponse;

        if (!res.ok || !body.ok) {
          if (attempts < maxAttempts) {
            setMessage("Waiting for your session to settle...");
            window.setTimeout(poll, 1000);
            return;
          }
          if (!cancelled) {
            setState("error");
            setMessage(body.ok ? "Could not verify your connection." : body.error);
          }
          return;
        }

        if (!cancelled) {
          setState(body.status.payoutsEnabled ? "success" : "incomplete");
          setMessage(
            body.status.payoutsEnabled
              ? "Stripe Connect is ready. Your tutor payouts are now connected."
              : "Stripe account created, but onboarding is not complete yet."
          );
        }
      } catch {
        if (attempts < maxAttempts) {
          setMessage("Waiting for your session to settle...");
          window.setTimeout(poll, 1000);
          return;
        }
        if (!cancelled) {
          setState("error");
          setMessage("Could not verify your Stripe connection. Please try again.");
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold bg-slate-900 text-white">
        {state === "success" ? "Stripe Connected" : state === "incomplete" ? "Stripe Setup Incomplete" : state === "error" ? "Stripe Connection Failed" : "Checking Stripe Connection"}
      </h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex gap-3">
        <Link href="/tutor" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Back to Tutor Dashboard
        </Link>
        <Link href="/tutor/stripe/refresh" className="rounded-md border bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Reopen Stripe
        </Link>
      </div>
    </div>
  );
}