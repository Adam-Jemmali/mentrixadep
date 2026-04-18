"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ReferralDashboardData } from "@/app/actions/referral";
import { Button } from "@/components/ui/button";

export function ReferralProgramSection({ initial }: { initial: ReferralDashboardData }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const displayTotal = initial.totalXpFromReferrals;

  const shareText = useMemo(
    () =>
      `Join me on Mentrixa — live tutoring, quests, and divisions. ${initial.inviteUrl}`,
    [initial.inviteUrl],
  );

  async function copyLink() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(initial.inviteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    });
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join Mentrixa",
          text: shareText,
          url: initial.inviteUrl,
        });
      } catch {
        /* user cancelled */
      }
    }
  }

  function openTwitter() {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  }

  function openWhatsApp() {
    const u = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Invite friends, earn XP</h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-md">
            Share your link. When a friend books their first session, you earn{" "}
            <span className="text-slate-700 font-medium tabular-nums">+500 XP</span>. They get{" "}
            <span className="text-slate-700 font-medium tabular-nums">+100 XP</span> when they join.
          </p>
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0 pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">From referrals</span>
          <motion.span
            className="text-xl font-semibold tabular-nums text-slate-900"
            key={displayTotal}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            {displayTotal.toLocaleString()} XP
          </motion.span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 truncate">
          {initial.inviteUrl}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1.5"
            disabled={pending}
            onClick={() => void copyLink()}
          >
            {copied ? (
              <Image src="/images/checks.png" alt="Copied" width={14} height={14} />
            ) : (
              <Image src="/images/book.png" alt="Copy" width={14} height={14} />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <Button type="button" size="sm" variant="outline" className="gap-1.5 border-slate-200" onClick={() => void nativeShare()}>
              <Image src="/images/live.png" alt="Share" width={14} height={14} />
              Share
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="border-slate-200" onClick={openTwitter}>
            X
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-slate-200" onClick={openWhatsApp}>
            WhatsApp
          </Button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Your code{" "}
        <span className="font-mono text-slate-600">{initial.referralCode}</span>
      </p>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-medium text-slate-700 mb-3">Your referrals</h3>
        {initial.referrals.length === 0 ? (
          <p className="text-sm text-slate-500">No invites yet. Share your link to get started.</p>
        ) : (
          <ul className="space-y-0 divide-y divide-slate-100 rounded-md border border-slate-100">
            {initial.referrals.map((r) => (
              <li key={r.referredId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-slate-900 font-medium">{r.label}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Joined {new Date(r.signedUpAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={
                      r.status === "booked_first_session"
                        ? "inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900"
                        : "inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                    }
                  >
                    {r.status === "booked_first_session" ? "Booked first session" : "Signed up"}
                  </span>
                  {r.status === "signed_up" ? (
                    <p className="mt-1 text-[10px] text-slate-400">+500 XP when they complete a session</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-emerald-700 tabular-nums">+{r.xpEarnedByReferrer} XP</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
