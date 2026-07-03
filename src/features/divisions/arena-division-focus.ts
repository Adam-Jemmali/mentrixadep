import { cn } from "@/shared/core/utils";

/** Paper arena focus — sticky/notebook tiles on the desk canvas. */
export const arenaDivisionFocus = {
  panelBorder: "border-[#C4B5FD]",
  panelRing: "shadow-[2px_3px_0_rgba(11,18,32,0.12)]",
  eyebrow: "text-[#6366F1]",
  hint: "text-[#64748B]",
  selectedBorder: "border-[#6366F1]",
  selectedRing: "ring-2 ring-[#7C3AED]/45 ring-offset-2 ring-offset-[#FAFAF8]",
  selectedGlow: "shadow-[3px_4px_0_rgba(11,18,32,0.16)]",
  focusVisible:
    "focus-visible:ring-2 focus-visible:ring-[#6366F1]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF8]",
  profileFocusBorder: "border-[#0891B2] ring-1 ring-[#0891B2]/35",
  idleBorder: "border-[#C4B5FD]",
  idleHover: "hover:border-[#7C3AED] hover:shadow-[2px_3px_0_rgba(11,18,32,0.12)]",
} as const;

export function arenaDivisionPanelClasses(className?: string) {
  return cn(className);
}

/** Large division tiles (duel hub, league hub). */
export function arenaDivisionCardClasses(options: {
  isSelected: boolean;
  isProfileFocus?: boolean;
}) {
  const { isSelected, isProfileFocus = false } = options;
  return cn(
    "group relative flex h-full flex-col rounded-2xl border-2 mx-hub-sticky mx-hub-ruled-lines mx-hub-paper mx-surface-light p-6 pt-5 outline-none transition-all duration-300 text-[#0B1220]",
    arenaDivisionFocus.focusVisible,
    isSelected
      ? cn(
          "z-[1] scale-[1.01]",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(arenaDivisionFocus.idleBorder, arenaDivisionFocus.idleHover),
    isProfileFocus && !isSelected && arenaDivisionFocus.profileFocusBorder,
  );
}

/** Compact picker tiles (home arena / focus selector). */
export function arenaDivisionPickerCardClasses(active: boolean) {
  return cn(
    "text-left rounded-xl border-2 p-3 sm:p-4 transition-all duration-200 outline-none mx-hub-paper mx-surface-light",
    arenaDivisionFocus.focusVisible,
    active
      ? cn(
          "z-[1] scale-[1.01] mx-hub-sticky mx-hub-ruled-lines text-[#0B1220]",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(
          "mx-hub-notebook mx-hub-ruled-lines text-[#334155]",
          arenaDivisionFocus.idleBorder,
          arenaDivisionFocus.idleHover,
        ),
  );
}
