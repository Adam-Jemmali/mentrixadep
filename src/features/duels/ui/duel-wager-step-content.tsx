"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { DUEL_WAGER_STEP_COPY } from "@/features/duels/duel-wager-ui-pure";
import { getDuelWagerMaxForViewer } from "@/features/duels/duel-wager";
import { DuelWagerPreview, DuelWagerXpDisplay } from "@/features/duels/ui/duel-wager-preview";
import { DuelWagerSlider } from "@/features/duels/ui/duel-wager-slider";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

export type DuelWagerStepResult = { amount: number };

type Props = {
  onConfirm: (result: DuelWagerStepResult) => void;
  onSkip: () => void;
  pending?: boolean;
  error?: string | null;
  className?: string;
  surface?: "dark" | "light";
};

/** Shared wager step body — slider, preview, CTAs. */
export function DuelWagerStepContent({
  onConfirm,
  onSkip,
  pending = false,
  error = null,
  className,
  surface = "dark",
}: Props) {
  const [max, setMax] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [amount, setAmount] = useState(0);
  const [loadingMax, setLoadingMax] = useState(true);

  useEffect(() => {
    void getDuelWagerMaxForViewer().then((r) => {
      setMax(r.affordableMax);
      setTotalXp(r.totalXp);
      setAmount(0);
      setLoadingMax(false);
    });
  }, []);

  const onDark = surface === "dark";

  if (loadingMax) {
    return (
      <div className={cn("py-6 text-center text-sm text-[#94A3B8]", className)} aria-busy>
        Loading stake cap…
      </div>
    );
  }

  if (max <= 0) {
    return (
      <StudentStickyNote variant="clip" className={cn("rotate-0 space-y-3 px-4 py-4", className)}>
        <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--mx-navy)]">
          <MentrixaVocabIcon name="xp" size={20} surface="light" title="XP" />
          {DUEL_WAGER_STEP_COPY.title}
        </p>
        <p className="text-sm leading-relaxed text-[#475569]">{DUEL_WAGER_STEP_COPY.needMoreXp}</p>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onSkip}
          className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
        >
          {DUEL_WAGER_STEP_COPY.skipCta}
        </Button>
      </StudentStickyNote>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <DuelWagerXpDisplay totalXp={totalXp} maxWager={max} />

      <DuelWagerSlider max={max} value={amount} onValueChange={setAmount} />

      <DuelWagerPreview yourWager={amount} maxWager={max} />

      {error ? <p className="text-sm font-semibold text-[#F87171]">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          disabled={pending || amount <= 0}
          onClick={() => onConfirm({ amount })}
          className={cn(
            mentrixStudent.pillPrimary,
            onDark && "bg-[var(--mx-violet)] hover:bg-[var(--mx-primary-hover)]",
            "inline-flex w-full items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] sm:w-auto",
          )}
        >
          <MentrixaVocabIcon name="duels" size={16} surface="dark" title="Stake" />
          {pending ? "Sending…" : `${DUEL_WAGER_STEP_COPY.addCta} →`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onSkip}
          className={cn(
            onDark ? "text-[#94A3B8] hover:text-white" : mentrixStudent.hubGhostLink,
            "text-[11px] font-black uppercase tracking-[0.14em]",
          )}
        >
          {DUEL_WAGER_STEP_COPY.skipCta}
        </Button>
      </div>
    </div>
  );
}
