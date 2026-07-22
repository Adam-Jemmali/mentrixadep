"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import { acceptSkillDuel, declineSkillDuel } from "@/features/duels/duel-gameplay";
import {
  acceptDuelXpWagerStake,
  rejectDuelXpWager,
  type DuelXpWagerRow,
} from "@/features/duels/duel-wager";
import { DuelInviteStakeBadge } from "@/features/duels/ui/duel-invite-stake-badge";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

type Props = {
  duelId: string;
  wager: DuelXpWagerRow | null;
  challengerName: string;
};

/** Opponent: accept duel; if stake pending, choose stake or skip stake. */
export function DuelInviteeActions({ duelId, wager, challengerName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingStake = wager?.status === "pending" ? wager : null;

  async function run(
    label: string,
    fn: () => Promise<{ success: true } | { success: false; error: string }>,
  ) {
    setLoading(label);
    setError(null);
    const r = await fn();
    setLoading(null);
    if (!r.success) {
      setError(r.error);
      return;
    }
    safeRouterRefresh(router);
  }

  return (
    <div className={cn(mentrixStudent.hubNotebook, "space-y-4 px-5 py-5 sm:px-6 sm:py-6")}>
      <div>
        <p className="mx-hub-ink-title inline-flex items-center gap-2 text-base">
          <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={20} surface="light" title="Duel" />
          You were challenged
        </p>
        <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
          Same questions. Highest score wins.
        </p>
        {pendingStake ? (
          <div className="mt-4">
            <DuelInviteStakeBadge
              challengerName={challengerName}
              amount={pendingStake.challengerWager}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {error ? (
          <span className="w-full text-sm font-semibold text-[#B45309]">{error}</span>
        ) : null}
        {pendingStake ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={loading !== null}
              onClick={() =>
                void run("stake", async () => {
                  const w = await acceptDuelXpWagerStake(duelId);
                  if (!w.success) return w;
                  return acceptSkillDuel(duelId);
                })
              }
              className={cn(
                mentrixStudent.pillPrimary,
                "text-[11px] font-black uppercase tracking-[0.14em]",
              )}
            >
              {loading === "stake" ? "…" : "Accept stake"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading !== null}
              onClick={() =>
                void run("skip", async () => {
                  const w = await rejectDuelXpWager(duelId);
                  if (!w.success) return w;
                  return acceptSkillDuel(duelId);
                })
              }
              className={cn(
                mentrixStudent.hubGhostLink,
                "text-[11px] font-black uppercase tracking-[0.14em]",
              )}
            >
              {loading === "skip" ? "…" : "Accept without stake"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={loading !== null}
            onClick={() => void run("acc", () => acceptSkillDuel(duelId))}
            className={cn(
              mentrixStudent.pillPrimary,
              "text-[11px] font-black uppercase tracking-[0.14em]",
            )}
          >
            {loading === "acc" ? "…" : "Accept"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading !== null}
          onClick={() => void run("dec", () => declineSkillDuel(duelId))}
          className={cn(
            mentrixStudent.hubGhostLink,
            "text-[11px] font-black uppercase tracking-[0.14em]",
          )}
        >
          {loading === "dec" ? "…" : "Decline"}
        </Button>
      </div>
    </div>
  );
}
