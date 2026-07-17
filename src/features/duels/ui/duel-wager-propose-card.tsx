"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import {
  getDuelWagerMaxForViewer,
  proposeDuelXpWager,
} from "@/features/duels/duel-wager";
import { cn } from "@/shared/core/utils";

/** Challenger: optional XP stake after challenge create. */
export function DuelWagerProposeCard({ duelId }: { duelId: string }) {
  const router = useRouter();
  const [max, setMax] = useState(0);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void getDuelWagerMaxForViewer().then((r) => {
      setMax(r.affordableMax);
      setAmount(0);
    });
  }, []);

  if (max <= 0) {
    return (
      <section className={cn(mentrixStudent.hubNotebook, "space-y-2 px-5 py-5")}>
        <p className="mx-hub-ink-title text-sm">Add a stake</p>
        <p className="mx-hub-ink-muted text-sm leading-relaxed">
          Need more XP. Keep at least 50 after a loss.
        </p>
      </section>
    );
  }

  return (
    <section className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-5 sm:px-6")}>
      <div>
        <p className="mx-hub-ink-title text-base">Add a stake</p>
        <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
          XP only. Optional. Cap {max} XP.
        </p>
      </div>
      <label className="block">
        <span className="mx-hub-ink-title font-mono text-sm tabular-nums">
          {amount} XP
        </span>
        <input
          type="range"
          min={0}
          max={max}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-2 w-full accent-[#7C3AED]"
          aria-label="Stake amount in XP"
        />
      </label>
      {error ? (
        <p className="text-sm font-semibold text-[#B45309]">{error}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || amount <= 0}
          onClick={() => {
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
          className={cn(
            mentrixStudent.pillPrimary,
            "text-[11px] font-black uppercase tracking-[0.14em]",
          )}
        >
          Set stake
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => safeRouterRefresh(router)}
          className={cn(
            mentrixStudent.hubGhostLink,
            "text-[11px] font-black uppercase tracking-[0.14em]",
          )}
        >
          Skip
        </Button>
      </div>
    </section>
  );
}
