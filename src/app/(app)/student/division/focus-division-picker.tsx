"use client";

import { DivisionPickerCards } from "@/features/student-profile/ui/division-picker-cards";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";
import { AP_CALC_AB_DIVISION_NAME } from "@/features/divisions/ap-calc-ab-division";
import {
  arenaDivisionFocus,
  arenaDivisionPanelClasses,
} from "@/features/divisions/arena-division-focus";

interface Props {
  focusedDivisionKey: string | null;
  divisionsCatalog: { key: string; name: string; description: string | null }[];
  xpByKey?: Record<string, number>;
}

export function FocusDivisionPicker({
  focusedDivisionKey,
  divisionsCatalog,
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
        Your {AP_CALC_AB_DIVISION_NAME} arena
      </p>
      <p className={cn("mt-1 max-w-2xl text-xs leading-relaxed", arenaDivisionFocus.hint)}>
        Leaderboard XP and duels run on the only skill tree we ship today.{" "}
        <span className="font-semibold text-cyan-300">Cyan outline</span> = active focus.
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
