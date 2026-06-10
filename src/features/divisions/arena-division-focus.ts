import { cn } from "@/shared/core/utils";

/** High-contrast focus on dark arena shell + white division cards (duels & league). */
export const arenaDivisionFocus = {
  panelBorder: "border-cyan-400/80",
  panelRing: "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]",
  eyebrow: "text-cyan-200",
  hint: "text-slate-200",
  selectedBorder: "border-cyan-500",
  selectedRing:
    "ring-[3px] ring-cyan-300 ring-offset-[6px] ring-offset-[#0a1224]",
  selectedGlow:
    "shadow-[0_0_0_2px_rgba(34,211,238,1),0_0_36px_-4px_rgba(34,211,238,0.55),0_18px_40px_-16px_rgba(6,182,212,0.35)]",
  focusVisible:
    "focus-visible:ring-[3px] focus-visible:ring-cyan-300 focus-visible:ring-offset-[6px] focus-visible:ring-offset-[#0a1224]",
  profileFocusBorder: "border-amber-400/90 ring-1 ring-amber-300/50",
  idleBorder: "border-slate-300/90",
  idleHover: "hover:border-cyan-400/70 hover:shadow-cyan-400/20",
} as const;

export function arenaDivisionPanelClasses(className?: string) {
  return cn(
    "border-2 p-4 sm:p-6",
    arenaDivisionFocus.panelBorder,
    arenaDivisionFocus.panelRing,
    className,
  );
}

/** Large division tiles (duel hub, league hub). */
export function arenaDivisionCardClasses(options: {
  isSelected: boolean;
  isProfileFocus?: boolean;
}) {
  const { isSelected, isProfileFocus = false } = options;
  return cn(
    "group relative flex h-full flex-col rounded-3xl border-2 bg-white p-6 outline-none transition-all duration-300",
    arenaDivisionFocus.focusVisible,
    isSelected
      ? cn(
          "z-[1] scale-[1.02] bg-white",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(
          arenaDivisionFocus.idleBorder,
          arenaDivisionFocus.idleHover,
          "hover:shadow-lg",
        ),
    isProfileFocus && !isSelected && arenaDivisionFocus.profileFocusBorder,
  );
}

/** Compact picker tiles (home arena / focus selector). */
export function arenaDivisionPickerCardClasses(active: boolean) {
  return cn(
    "text-left rounded-xl border-2 p-3 sm:p-4 transition-all duration-200 outline-none",
    arenaDivisionFocus.focusVisible,
    active
      ? cn(
          "z-[1] scale-[1.01] bg-white",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(
          arenaDivisionFocus.idleBorder,
          arenaDivisionFocus.idleHover,
          "bg-white hover:shadow-md",
        ),
  );
}
