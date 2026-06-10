"use client";

import { DivisionPickerCards } from "@/features/student-profile/ui/division-picker-cards";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";
import {
  arenaDivisionFocus,
  arenaDivisionPanelClasses,
} from "@/features/divisions/arena-division-focus";

interface Props {
  focusedDivisionKey: string | null;
  divisionsCatalog: { key: string; name: string; description: string | null }[];
  currentDivisionKey: string | null;
  xpByKey?: Record<string, number>;
}

export function FocusDivisionPicker({
  focusedDivisionKey,
  divisionsCatalog,
  currentDivisionKey,
  xpByKey,
}: Props) {
  return (
    <div className={cn(mentrixStudent.cardArena, arenaDivisionPanelClasses("mt-5"))}>
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.22em]",
          arenaDivisionFocus.eyebrow,
        )}
      >
        Your home arena
      </p>
      <p className={cn("mt-1 max-w-2xl text-xs leading-relaxed", arenaDivisionFocus.hint)}>
        Pick where you compete on the leaderboard, earn XP, and match duels.{" "}
        <span className="font-semibold text-cyan-300">
          Cyan outline
        </span>{" "}
        = active focus.
        {currentDivisionKey ? (
          <>
            {" "}
            Smart default follows your strongest subject (now{" "}
            {currentDivisionKey.replace(/-/g, " ")}).
          </>
        ) : null}
      </p>
      <div className="mt-4">
        <DivisionPickerCards
          mode="focus"
          divisions={divisionsCatalog}
          selectedKey={focusedDivisionKey}
          showAutomaticOption
          xpByKey={xpByKey}
        />
      </div>
    </div>
  );
}
