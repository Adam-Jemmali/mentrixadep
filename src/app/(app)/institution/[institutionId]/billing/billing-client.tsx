"use client";

import { Check } from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";
import type { Institution } from "@/shared/types/database";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try Mentrixa with a small group.",
    limit: "Up to 10 students",
    features: [
      "10 student seats",
      "Session booking",
      "Basic reporting",
      "Email support",
    ],
    cta: null,
    highlight: false,
  },
  {
    key: "basic",
    name: "Basic",
    price: "$299",
    period: "/ month",
    description: "For departments and small cohorts.",
    limit: "Up to 50 students",
    features: [
      "50 student seats",
      "All AI features (Quests, Studio)",
      "Monthly usage reports",
      "Custom domain auto-enroll",
      "Priority email support",
    ],
    cta: "Upgrade to Basic",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$999",
    period: "/ month",
    description: "For institutions that go all-in.",
    limit: "Unlimited students",
    features: [
      "Unlimited student seats",
      "All AI features",
      "Dedicated account manager",
      "Custom tutor pool",
      "SLA + priority support",
      "Custom branding & logo",
      "Negotiated tutor rates",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
] as const;

export function BillingClient({
  institution,
  usage,
}: {
  institution: Institution;
  usage: { sessionsThisMonth: number; creditsRemaining: number };
}) {
  const currentPlan = institution.plan;

  return (
    <div className="space-y-8 max-w-[860px]">
      <div>
        <h1 className="text-[15px] font-semibold text-slate-900">Billing & plan</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Manage your institution plan and session credits</p>
      </div>

      {/* Credits strip */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
            <MentrixaVocabIcon name="session" size={16} surface="light" title="Session credits" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-800">Session credits</p>
            <p className="text-[11px] text-slate-400">Prepaid sessions — used before per-session billing kicks in</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-slate-900 tabular-nums">
            {usage.creditsRemaining}
            <span className="text-[12px] font-normal text-slate-400 ml-1">remaining</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{usage.sessionsThisMonth} used this month</p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isLower =
            (currentPlan === "basic" && plan.key === "free") ||
            (currentPlan === "pro" && (plan.key === "free" || plan.key === "basic"));

          return (
            <div
              key={plan.key}
              className={cn(
                "relative rounded-lg border p-5 flex flex-col",
                plan.highlight
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-[#E5E7EB] bg-white",
                isCurrent && !plan.highlight && "border-emerald-500/50 bg-emerald-50/30"
              )}
            >
              {isCurrent && (
                <span className={cn(
                  "absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  plan.highlight ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                )}>
                  Current
                </span>
              )}

              <div className="mb-4">
                <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", plan.highlight ? "text-slate-400" : "text-slate-500")}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-bold", plan.highlight ? "text-white" : "text-slate-900")}>
                    {plan.price}
                  </span>
                  <span className={cn("text-[12px]", plan.highlight ? "text-slate-400" : "text-slate-400")}>
                    {plan.period}
                  </span>
                </div>
                <p className={cn("text-[11px] mt-1", plan.highlight ? "text-slate-400" : "text-slate-500")}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", plan.highlight ? "text-emerald-400" : "text-emerald-500")}
                      strokeWidth={2.5}
                    />
                    <span className={cn("text-[12px]", plan.highlight ? "text-slate-300" : "text-slate-600")}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.cta && !isCurrent && !isLower ? (
                <a
                  href="mailto:enterprise@mentrixa.one?subject=Institution Plan Upgrade"
                  className={cn(
                    "block text-center text-[12px] font-semibold py-2 rounded-md transition-colors",
                    plan.highlight
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {plan.cta}
                </a>
              ) : isCurrent ? (
                <div className={cn(
                  "text-center text-[12px] py-2 rounded-md",
                  plan.highlight ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500"
                )}>
                  Active plan
                </div>
              ) : isLower ? (
                <div className={cn("text-center text-[12px] py-2 text-slate-400")}>
                  —
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400">
        To upgrade, contact{" "}
        <a href="mailto:enterprise@mentrixa.one" className="text-slate-600 underline underline-offset-2">
          enterprise@mentrixa.one
        </a>
        . Custom contracts available for 100+ students.
      </p>
    </div>
  );
}
