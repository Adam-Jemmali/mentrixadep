"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/shared/core/utils";
import type { ProficiencyScanResult } from "@/features/tutor/guide-proficiency-scan-pure";
import { GUIDE_PROFICIENCY_SCAN } from "@/features/tutor/guide-home-copy-pure";

const STEP_MS = 380;

type GuideProficiencyScanRevealProps = {
  scan: ProficiencyScanResult;
  onComplete: (verdict: ProficiencyScanResult["verdict"]) => void;
};

export function GuideProficiencyScanReveal({ scan, onComplete }: GuideProficiencyScanRevealProps) {
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (revealed < scan.checks.length) {
      const timer = window.setTimeout(() => setRevealed((n) => n + 1), STEP_MS);
      return () => window.clearTimeout(timer);
    }
    if (completedRef.current) return;
    const timer = window.setTimeout(() => {
      completedRef.current = true;
      setDone(true);
      onComplete(scan.verdict);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [revealed, scan.checks.length, scan.verdict, onComplete]);

  const verified = scan.verdict === "verified";

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-[#C4B5FD] bg-[#F5F3FF]/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#5B21B6]">
          {GUIDE_PROFICIENCY_SCAN.scanning}
        </p>
        <span className="text-xs font-semibold tabular-nums text-[#64748B]">
          {Math.min(revealed, scan.checks.length)}/{scan.checks.length}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div
          className="h-full rounded-full bg-[#7C3AED] transition-all duration-300"
          style={{ width: `${(revealed / scan.checks.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {scan.checks.map((check, index) => {
          const visible = index < revealed;
          const pending = index === revealed && !done;
          return (
            <li
              key={check.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all duration-200",
                !visible && "border-transparent opacity-40",
                visible && check.pass && "border-emerald-200 bg-emerald-50/80",
                visible && !check.pass && "border-amber-200 bg-amber-50/80",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {!visible ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#CBD5E1] bg-white" />
                ) : pending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
                ) : check.pass ? (
                  <Check className="h-5 w-5 text-emerald-700" strokeWidth={3} />
                ) : (
                  <X className="h-5 w-5 text-amber-800" strokeWidth={3} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B1220]">{check.label}</p>
                {visible && !pending ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">{check.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {done ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            verified ? "border-[#D4A017]/40 bg-[#FFFBEB]" : "border-amber-300 bg-amber-50",
          )}
        >
          <p
            className={cn(
              "text-sm font-bold",
              verified ? "text-[#92400E]" : "text-amber-950",
            )}
          >
            {scan.verdictSentence}
          </p>
          <p className="mt-1 text-xs font-medium text-[#475569]">{scan.nextAction}</p>
        </div>
      ) : null}
    </div>
  );
}
