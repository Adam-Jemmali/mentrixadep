"use client";

import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { StudentHubAnimatedFraction } from "@/features/student-home/student-hub-animated-fraction";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export function StudentHubQuestScoreCard({
  correct,
  total,
  subject,
  perfect = false,
  variant = "clip",
  className,
}: {
  correct: number;
  total: number;
  subject: string;
  perfect?: boolean;
  variant?: LandingStickyVariant;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <LandingStickyNote
      variant={variant}
      compact
      className={cn("relative px-2 py-3 text-center", className)}
    >
      <div className="relative mx-auto flex justify-center">
        <MentrixaVocabIcon
          name="practice-pack"
          size={26}
          surface="light"
          gold={pct >= 90}
          title={perfect ? "Perfect pack" : "Quest score"}
        />
      </div>
      <StudentHubAnimatedFraction
        className="mt-2 justify-center"
        numerator={correct}
        denominator={total}
        percent={pct}
        unitLabel="in pack"
        compact
      />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#6366F1]">
        {perfect ? "Perfect pack" : "Quest score"}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[#475569]">
        Practice pack on {subject}. Not a verified first try.
      </p>
    </LandingStickyNote>
  );
}
