"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { DUEL_WAGER_STEP_COPY } from "@/features/duels/duel-wager-ui-pure";
import { sendDuelChallengeWithWager } from "@/features/duels/duel-challenge-send";
import { DuelWagerStepContent } from "@/features/duels/ui/duel-wager-step-content";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponentId: string;
  opponentName: string;
  divisionKey: string;
};

function useMobileViewport(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => setMobile(window.innerWidth <= breakpoint);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);

  return mobile;
}

function WagerStepHeader({ opponentName }: { opponentName: string }) {
  const first = opponentName.trim().split(/\s+/)[0] || opponentName.trim() || "Rival";

  return (
    <div className="space-y-3">
      <StudentStickyNote variant="clip" className="rotate-0 px-3 py-2.5">
        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
          <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={18} surface="light" title="Duel" />
          Challenge {first}
        </p>
      </StudentStickyNote>
      <div>
        <h2 className="text-lg font-bold text-white">{DUEL_WAGER_STEP_COPY.title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#94A3B8]">
          {DUEL_WAGER_STEP_COPY.subtitle}
        </p>
      </div>
    </div>
  );
}

/** Optional wager step between opponent pick and send — Drawer mobile, Dialog desktop. */
export function DuelChallengeFlow({
  open,
  onOpenChange,
  opponentId,
  opponentName,
  divisionKey,
}: Props) {
  const router = useRouter();
  const isMobile = useMobileViewport();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sendChallenge = useCallback(
    (wagerAmount: number) => {
      setError(null);
      startTransition(async () => {
        const result = await sendDuelChallengeWithWager({
          opponentStudentId: opponentId,
          divisionKey,
          wagerAmount,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        if (result.wagerError) {
          setError(result.wagerError);
        }

        onOpenChange(false);
        router.push(`/student/duel/${result.duelId}`);
      });
    },
    [divisionKey, onOpenChange, opponentId, router],
  );

  const stepBody = (
    <DuelWagerStepContent
      surface="dark"
      pending={pending}
      error={error}
      onConfirm={({ amount }) => sendChallenge(amount)}
      onSkip={() => sendChallenge(0)}
    />
  );

  if (isMobile) {
    return (
      <MentrixaDrawer
        isOpen={open}
        onOpenChange={onOpenChange}
        placement="bottom"
        tone="dark"
        title={DUEL_WAGER_STEP_COPY.title}
        description={DUEL_WAGER_STEP_COPY.subtitle}
        showHandle
        hideHeader
        bodyClassName="max-h-[82vh] overflow-y-auto px-4 pb-6 pt-2"
        contentClassName="border-t border-[#334155]"
      >
        {open ? (
          <div className="space-y-5">
            <WagerStepHeader opponentName={opponentName} />
            {stepBody}
          </div>
        ) : null}
      </MentrixaDrawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md gap-0 border-[#334155] bg-[var(--mx-navy-2)] p-0 text-white",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
        )}
      >
        <DialogHeader className="border-b border-[#334155] px-6 py-5">
          <DialogTitle className="sr-only">{DUEL_WAGER_STEP_COPY.title}</DialogTitle>
          <DialogDescription className="sr-only">{DUEL_WAGER_STEP_COPY.subtitle}</DialogDescription>
          <WagerStepHeader opponentName={opponentName} />
        </DialogHeader>
        <div className="px-6 py-5">{stepBody}</div>
      </DialogContent>
    </Dialog>
  );
}
