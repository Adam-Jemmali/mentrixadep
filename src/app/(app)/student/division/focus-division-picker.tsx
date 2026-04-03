"use client";

import { DivisionPickerCards } from "@/components/student/division-picker-cards";

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
    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-4 sm:p-5 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900 tracking-tight">
          Your home arena
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
          Pick where you compete on the leaderboard, earn XP, and match duels.{" "}
          <span className="text-slate-600">
            Smart default follows your strongest subject
            {currentDivisionKey ? ` (now ${currentDivisionKey.replace(/-/g, " ")})` : ""}.
          </span>
        </p>
      </div>
      <DivisionPickerCards
        mode="focus"
        divisions={divisionsCatalog}
        selectedKey={focusedDivisionKey}
        showAutomaticOption
        xpByKey={xpByKey}
      />
    </div>
  );
}
