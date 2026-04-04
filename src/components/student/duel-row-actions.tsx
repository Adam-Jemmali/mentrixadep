"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  hideSkillDuelFromList,
  withdrawPendingSkillDuel,
} from "@/app/actions/duel";
import { Button } from "@/components/ui/button";

type Props = {
  duelId: string;
  status: string;
  myId: string;
  studentId: string;
  opponentStudentId: string | null;
};

export function DuelRowActions({
  duelId,
  status,
  myId,
  studentId,
  opponentStudentId,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isChallenger = studentId === myId;
  const isOpponent =
    opponentStudentId != null && opponentStudentId === myId;

  if (status === "pending" && isChallenger) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-slate-500 shrink-0"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void (async () => {
            const r = await withdrawPendingSkillDuel(duelId);
            setBusy(false);
            if (r.success) router.refresh();
          })();
        }}
      >
        {busy ? "…" : "Cancel"}
      </Button>
    );
  }

  const terminal =
    status === "completed" ||
    status === "declined" ||
    status === "cancelled";
  if (terminal && (isChallenger || isOpponent)) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-slate-500 shrink-0"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void (async () => {
            const r = await hideSkillDuelFromList(duelId);
            setBusy(false);
            if (r.success) router.refresh();
          })();
        }}
      >
        {busy ? "…" : "Hide"}
      </Button>
    );
  }

  return null;
}
