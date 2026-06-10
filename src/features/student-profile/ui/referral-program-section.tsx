"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Image from "next/image";

import { motion } from "framer-motion";
import type { ReferralDashboardData } from "@/features/referrals/referrals";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

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



  function openTwitter() {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  }

  function openWhatsApp() {
    const u = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-white p-6 sm:p-8 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.08)]">
      
      {/* ── Header & Description ── */}
      <div className="space-y-3 mb-8">
        <h2 className="text-sm font-black uppercase tracking-[0.25em] text-indigo-950">Strategic Recruitment</h2>
        <p className="text-sm leading-relaxed text-slate-500 max-w-md">
          Enlist fellow Mentrixers. When they book their first session, you secure{" "}
          <span className="font-bold text-indigo-600 tracking-wide">+500 XP</span>.
        </p>
      </div>

      {/* ── Recruitment Gains Stats ── */}
      <div className="mb-8 rounded-3xl bg-indigo-50/50 p-6 border border-indigo-100/50 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Recruitment Gains</p>
          <motion.p
            className="text-3xl font-black italic tabular-nums text-indigo-900"
            key={displayTotal}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
          >
            {displayTotal.toLocaleString()} XP
          </motion.p>
        </div>
        <Image
          src="/icons/mentrixer.svg"
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 opacity-80"
        />
      </div>

      {/* ── Invitation Hub ── */}
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Invitation Signal</p>
          
          {/* URL Box */}
          <div className="w-full rounded-2xl border border-indigo-100 bg-slate-50/30 px-5 py-4 text-sm font-medium text-indigo-600 break-all shadow-inner">
            {initial.inviteUrl}
          </div>
          
          {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void copyLink()}
                disabled={pending}
                className="h-12 flex-1 min-w-[150px] rounded-2xl bg-indigo-600 text-xs font-black uppercase italic tracking-widest text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
              >
                {copied ? "Link Secured" : "Copy Signal"}
              </Button>
              <ClientOnlyShareButton shareText={shareText} inviteUrl={initial.inviteUrl} />
            </div>
        </div>

        {/* ── Social Deploy Row ── */}
        <div className="pt-6 border-t border-indigo-50">
          <div className="flex items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deploy via</p>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 w-11 rounded-full border-indigo-100 bg-white hover:bg-indigo-50 text-indigo-600 shadow-sm flex items-center justify-center p-0" 
                onClick={openTwitter}
              >
                <svg 
                  className="h-4 w-4 fill-indigo-600" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 w-11 rounded-full border-indigo-100 bg-white hover:bg-indigo-50 shadow-sm flex items-center justify-center p-0" 
                onClick={openWhatsApp}
              >
                <svg 
                  className="h-5 w-5 fill-indigo-600" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.446 4.432-9.877 9.888-9.877 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.889 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.035c0 2.123.556 4.197 1.609 6.033L0 24l6.105-1.602a11.83 11.83 0 005.937 1.606h.005c6.637 0 12.032-5.396 12.035-12.037a11.85 11.85 0 00-3.486-8.451z" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Enlisted List Section ── */}
      <div className="mt-10 pt-10 border-t border-indigo-100/50">
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950 mb-6">Enlisted Mentrixers</h3>
        
        {initial.referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-[2.5rem] border-2 border-dashed border-indigo-50 bg-indigo-50/10">
             <Image
               src="/icons/mentrixer.svg"
               alt=""
               width={40}
               height={40}
               unoptimized
               className="h-10 w-10 opacity-10 grayscale"
             />
             <p className="mt-4 text-[10px] font-black text-indigo-200 uppercase tracking-widest">No recruits active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initial.referrals.map((r) => (
              <div key={r.referredId} className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-50 bg-white px-5 py-4 shadow-sm hover:border-indigo-100 transition-all">
                <div className="min-w-0">
                  <p className="text-sm font-black italic tracking-tight text-indigo-900 truncate">{r.label}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Enlisted {new Date(r.signedUpAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                      r.status === "booked_first_session"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-indigo-100 bg-indigo-50 text-indigo-500"
                    )}
                  >
                    {r.status === "booked_first_session" ? "Deployed" : "Training"}
                  </span>
                  {r.status === "booked_first_session" && (
                    <p className="mt-1 text-[10px] font-black tabular-nums text-emerald-500">+{r.xpEarnedByReferrer} XP</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function ClientOnlyShareButton({ shareText, inviteUrl }: { shareText: string, inviteUrl: string }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);
  
  async function nativeShare() {
    try {
      await navigator.share({
        title: "Join Mentrixa",
        text: shareText,
        url: inviteUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  if (!canShare) return null;

  return (
    <Button 
      type="button" 
      variant="outline" 
      className="h-12 rounded-2xl border-indigo-200 bg-white px-6 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 shadow-sm" 
      onClick={() => void nativeShare()}
    >
      Share Signal
    </Button>
  );
}
