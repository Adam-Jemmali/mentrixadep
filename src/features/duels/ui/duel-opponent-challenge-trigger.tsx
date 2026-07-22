"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { DuelChallengeFlow } from "@/features/duels/ui/duel-challenge-flow";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

type Props = {
  opponentId: string;
  opponentName: string;
  divisionKey: string;
  className?: string;
  size?: "sm" | "default";
  children?: ReactNode;
};

/** Opens wager step then sends a direct duel challenge. */
export function DuelOpponentChallengeTrigger({
  opponentId,
  opponentName,
  divisionKey,
  className,
  size = "sm",
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant="ghost"
        className={cn(
          mentrixStudent.hubGhostLink,
          "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={14} surface="light" title="Duel" />
            Challenge
          </>
        )}
      </Button>
      <DuelChallengeFlow
        open={open}
        onOpenChange={setOpen}
        opponentId={opponentId}
        opponentName={opponentName}
        divisionKey={divisionKey}
      />
    </>
  );
}
