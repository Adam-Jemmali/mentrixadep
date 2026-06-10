"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hideSkillDuelFromList } from "@/features/duels/duel-gameplay";
import { Button } from "@/shared/ui/button";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";

type Props = {
  duelId: string;
  status: string;
  myId: string;
  studentId: string;
  opponentStudentId: string | null;
  isAiOpponent?: boolean;
  onRemoved?: (duelId: string) => void;
  onError?: (message: string) => void;
};

export function DuelRowActions({
  duelId,
  status,
  myId,
  studentId,
  opponentStudentId,
  isAiOpponent = false,
  onRemoved,
  onError,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isChallenger = studentId === myId;
  const isOpponent =
    opponentStudentId != null && opponentStudentId === myId;

  if (status === "pending" && isOpponent && !isAiOpponent) {
    return null;
  }

  if (!isChallenger && !isOpponent) {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="shrink-0 text-slate-500 hover:text-rose-600"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void (async () => {
          const r = await hideSkillDuelFromList(duelId);
          setBusy(false);
          if (r.success) {
            onRemoved?.(duelId);
            safeRouterRefresh(router);
          } else {
            onError?.(r.error);
          }
        })();
      }}
    >
      {busy ? "…" : "Remove"}
    </Button>
  );
}
