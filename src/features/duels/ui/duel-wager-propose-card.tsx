"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import { proposeDuelXpWager } from "@/features/duels/duel-wager";
import { DuelWagerStepContent } from "@/features/duels/ui/duel-wager-step-content";
import { DUEL_WAGER_STEP_COPY } from "@/features/duels/duel-wager-ui-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

/** Challenger fallback stake card when wager was not set at compose time. */
export function DuelWagerProposeCard({ duelId }: { duelId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setSkipped(false);
    setError(null);
  }, [duelId]);

  if (skipped) return null;

  return (
    <section className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-5 sm:px-6")}>
      <div>
        <p className="mx-hub-ink-title inline-flex items-center gap-2 text-base">
          <MentrixaVocabIcon name="xp" size={20} gold surface="light" title="Stake" />
          {DUEL_WAGER_STEP_COPY.title}
        </p>
        <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
          {DUEL_WAGER_STEP_COPY.subtitle}
        </p>
      </div>
      <DuelWagerStepContent
        surface="light"
        pending={pending}
        error={error}
        onConfirm={({ amount }) => {
          setError(null);
          startTransition(async () => {
            const r = await proposeDuelXpWager(duelId, amount);
            if (!r.success) {
              setError(r.error);
              return;
            }
            safeRouterRefresh(router);
          });
        }}
        onSkip={() => {
          setSkipped(true);
          safeRouterRefresh(router);
        }}
      />
    </section>
  );
}
