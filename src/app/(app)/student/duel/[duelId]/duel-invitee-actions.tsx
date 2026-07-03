"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptSkillDuel, declineSkillDuel } from "@/features/duels/duel-gameplay";
import { Button } from "@/shared/ui/button";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

/** Shown to the challenged learner while the duel is pending. */
export function DuelInviteeActions({ duelId }: { duelId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"acc" | "dec" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading("acc");
    setError(null);
    const r = await acceptSkillDuel(duelId);
    setLoading(null);
    if (!r.success) {
      setError(r.error);
      return;
    }
    safeRouterRefresh(router);
  }

  async function decline() {
    setLoading("dec");
    setError(null);
    const r = await declineSkillDuel(duelId);
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
        <p className="mx-hub-ink-title text-base">You were challenged to a skill duel</p>
        <p className="mx-hub-ink-muted mt-2 text-sm leading-relaxed">
          If you accept, the quiz is generated and you both answer the same questions. Highest score
          wins.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {error ? <span className="w-full text-sm font-semibold text-[#B45309]">{error}</span> : null}
        <Button
          type="button"
          size="sm"
          disabled={loading !== null}
          onClick={() => void accept()}
          className={cn(mentrixStudent.pillPrimary, "text-[11px] font-black uppercase tracking-[0.14em]")}
        >
          {loading === "acc" ? "Accepting…" : "Accept and start quiz"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading !== null}
          onClick={() => void decline()}
          className={cn(mentrixStudent.hubGhostLink, "text-[11px] font-black uppercase tracking-[0.14em]")}
        >
          {loading === "dec" ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
  );
}
