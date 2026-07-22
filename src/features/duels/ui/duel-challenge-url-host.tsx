"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DuelChallengeFlow } from "@/features/duels/ui/duel-challenge-flow";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";

/** Auto opens wager step when /student/duel?challenge=… is present. */
export function DuelChallengeUrlHost({ defaultDivisionKey }: { defaultDivisionKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const challenge = useMemo(() => {
    const opponentId = searchParams.get("challenge")?.trim() ?? "";
    const opponentName = searchParams.get("name")?.trim() || "Rival";
    const divisionKey =
      searchParams.get("division")?.trim() || defaultDivisionKey || AP_CALC_AB_DIVISION_KEY;

    if (!opponentId) return null;
    return { opponentId, opponentName, divisionKey };
  }, [defaultDivisionKey, searchParams]);

  useEffect(() => {
    if (challenge) {
      setOpen(true);
    }
  }, [challenge]);

  function clearQuery() {
    router.replace("/student/duel", { scroll: false });
  }

  if (!challenge) return null;

  return (
    <DuelChallengeFlow
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) clearQuery();
      }}
      opponentId={challenge.opponentId}
      opponentName={challenge.opponentName}
      divisionKey={challenge.divisionKey}
    />
  );
}
