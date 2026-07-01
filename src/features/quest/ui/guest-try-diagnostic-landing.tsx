"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { VerifiedFirstAttemptDisclosure } from "@/shared/ui/disclosure-patterns";
import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { Typewriter } from "@/shared/ui/typewriter";
import { ParticleTextEffect } from "@/shared/ui/particle-text-effect";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

const HIGHLIGHTS = [
  {
    src: "/images/quest.webp",
    label: "One traced problem",
    detail: "Step by step reasoning from the reviewed bank",
  },
  {
    src: "/images/checks.webp",
    label: "Trap tagged",
    detail: "See where your reasoning diverged from a strong student",
  },
  {
    src: "/icons/mentrixer-rank.svg",
    label: "Rank passport",
    detail: "Preview what signing up locks on your public card",
  },
] as const;

export function GuestTryDiagnosticLanding({
  busy,
  err,
  onStart,
  embedded = false,
}: {
  busy: boolean;
  err: string | null;
  onStart: () => void;
  embedded?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative mx-auto w-full",
        embedded ? "max-w-3xl px-4 py-6" : "max-w-4xl px-4 py-8 sm:py-12",
      )}
    >
      <div className="pointer-events-none absolute -left-8 top-0 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-6 bottom-12 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />

      <div className="relative z-10 space-y-6">
        <p className="pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">
          Free diagnostic
          <span className="mx-2 text-white/15">·</span>
          {AP_CALC_AB_SUBJECT}
        </p>

        <div className="text-center sm:text-left">
          <h1 className="min-h-[2.75rem] text-3xl font-bold leading-tight tracking-tight text-white sm:min-h-[3.25rem] sm:text-4xl">
            <Typewriter
              text="Find the gap before the exam does"
              speed={55}
              waitTime={12000}
              loop={false}
              className="text-white"
            />
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
            1 traced problem. 1 verdict. 1 rank passport preview.
          </p>
        </div>

        <div className="flex min-h-[72px] items-center justify-center py-1">
          <ParticleTextEffect
            words={["DIAGNOSTIC", "TRAP", "SKILL", "RANK"]}
            tone="onDark"
            className="max-w-xl text-center"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ src, label, detail }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-500/15 p-1.5">
                <Image src={src} alt="" width={28} height={28} className="size-7 object-contain" />
              </span>
              <p className="mt-3 text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} tone="marketing" />

        {err ? (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        ) : null}

        {busy ? (
          <div className="rounded-2xl border border-white/10 bg-[#0F172A]/80 px-4 py-8 sm:px-6">
            <QuestPackLoadPendingPanel tone="dark" loaderSize="lg" />
          </div>
        ) : (
          <Button
            className="h-14 w-full rounded-xl bg-[#7C3AED] text-base font-semibold text-white shadow-[0_12px_40px_rgba(124,58,237,0.3)] hover:bg-[#6D28D9]"
            onClick={onStart}
            disabled={busy}
          >
            Find out what you do not know
          </Button>
        )}

        <p className="text-center text-xs text-slate-500">
          No account required to try.{" "}
          <span style={{ color: VERIFIED_GOLD }}>First attempts after signup lock rank.</span>
        </p>
      </div>
    </motion.div>
  );
}
