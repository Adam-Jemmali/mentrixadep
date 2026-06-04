"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptSkillDuel, declineSkillDuel } from "@/app/actions/duel";
import { Button } from "@/components/ui/button";
import { safeRouterRefresh } from "@/lib/safe-router-refresh";

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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
      <p className="text-sm text-slate-900 font-medium">You were challenged to a skill duel</p>
      <p className="text-xs text-slate-600">
        If you accept, the quiz is generated and you both answer the same questions. Highest score
        wins.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {error && <span className="text-sm text-red-600 w-full">{error}</span>}
        <Button
          type="button"
          size="sm"
          disabled={loading !== null}
          onClick={() => void accept()}
        >
          {loading === "acc" ? "Accepting…" : "Accept & start quiz"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void decline()}
        >
          {loading === "dec" ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
  );
}
