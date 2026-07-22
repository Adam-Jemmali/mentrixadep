"use client";

import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { VerifiedFirstAttemptDisclosure } from "@/shared/ui/disclosure-patterns";
import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { Typewriter } from "@/shared/ui/typewriter";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_QUEST_ICON,
  CANONICAL_RANK_PROOF_ICON,
} from "@/shared/icons/vocab-canonical";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

const VERIFIED_GOLD = "#D4A017";

const HIGHLIGHTS: Array<{
  icon: VocabIconName;
  gold?: boolean;
  label: string;
  detail: string;
}> = [
  {
    icon: CANONICAL_QUEST_ICON,
    label: "One traced problem",
    detail: "Step by step reasoning from the reviewed bank",
  },
  {
    icon: "focus-ring",
    label: "Trap tagged",
    detail: "See where your reasoning diverged from a strong student",
  },
  {
    icon: CANONICAL_RANK_PROOF_ICON,
    gold: true,
    label: "Rank passport",
    detail: "Preview what signing up locks on your public card",
  },
];

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
      <div className={`${mentrixStudent.card} space-y-6 p-6 sm:p-8`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6366F1]">
          Free diagnostic
          <span className="mx-2 text-[#C4B5FD]">| </span>
          {AP_CALC_AB_SUBJECT}
        </p>

        <div className="text-center sm:text-left">
          <h1 className="min-h-[2.75rem] text-3xl font-bold leading-tight tracking-tight text-[#0B1220] sm:min-h-[3.25rem] sm:text-4xl">
            <Typewriter
              text="Find the gap before the exam does"
              speed={55}
              waitTime={12000}
              loop={false}
              className="text-[#0B1220]"
            />
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#475569] sm:text-base">
            1 traced problem. 1 verdict. 1 rank passport preview.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon, gold, label, detail }) => (
            <div
              key={label}
              className="rounded-xl border border-[#C4B5FD] bg-white/80 p-4"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#EDE9FE] p-1.5">
                <MentrixaVocabIcon name={icon} size={28} gold={gold} surface="light" title={label} />
              </span>
              <p className="mt-3 text-sm font-semibold text-[#0B1220]">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#475569]">{detail}</p>
            </div>
          ))}
        </div>

        <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} tone="light" />

        {err ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </p>
        ) : null}

        {busy ? (
          <div className="rounded-xl border border-[#C4B5FD] bg-white/80 px-4 py-8 sm:px-6">
            <QuestPackLoadPendingPanel className="max-w-xs" />
          </div>
        ) : (
          <Button
            className="h-14 w-full rounded-xl bg-[#7C3AED] text-base font-semibold text-white shadow-[2px_3px_0_#0B1220] hover:bg-[#6D28D9]"
            onClick={onStart}
            disabled={busy}
          >
            Find out what you do not know
          </Button>
        )}

        <p className="text-center text-xs text-[#475569]">
          No account required to try.{" "}
          <span style={{ color: VERIFIED_GOLD }}>First attempts after signup lock rank.</span>
        </p>
      </div>
    </motion.div>
  );
}
