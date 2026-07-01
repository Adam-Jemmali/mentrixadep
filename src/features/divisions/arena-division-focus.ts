import { cn } from "@/shared/core/utils";

/** High-contrast focus on dark arena shell + logo-gradient division cards. */
export const arenaDivisionFocus = {
  panelBorder: "border-violet-500/40",
  panelRing: "shadow-[inset_0_0_0_1px_rgba(124,58,237,0.22)]",
  eyebrow: "text-violet-200",
  hint: "text-violet-100/80",
  selectedBorder: "border-violet-400",
  selectedRing:
    "ring-[3px] ring-violet-400/80 ring-offset-[6px] ring-offset-[#0B1220]",
  selectedGlow:
    "shadow-[0_0_0_2px_rgba(124,58,237,0.85),0_0_36px_-4px_rgba(99,102,241,0.55),0_18px_40px_-16px_rgba(79,70,229,0.35)]",
  focusVisible:
    "focus-visible:ring-[3px] focus-visible:ring-violet-400/80 focus-visible:ring-offset-[6px] focus-visible:ring-offset-[#0B1220]",
  profileFocusBorder: "border-amber-400/90 ring-1 ring-amber-300/50",
  idleBorder: "border-indigo-500/30",
  idleHover: "hover:border-violet-400/55 hover:shadow-violet-500/25",
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
    "group relative flex h-full flex-col rounded-3xl border-2 mx-panel-brand p-6 outline-none transition-all duration-300 text-violet-50",
    arenaDivisionFocus.focusVisible,
    isSelected
      ? cn(
          "z-[1] scale-[1.02]",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(
          "mx-panel-brand-muted",
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
          "z-[1] scale-[1.01] mx-panel-brand text-violet-50",
          arenaDivisionFocus.selectedBorder,
          arenaDivisionFocus.selectedRing,
          arenaDivisionFocus.selectedGlow,
        )
      : cn(
          arenaDivisionFocus.idleBorder,
          arenaDivisionFocus.idleHover,
          "mx-panel-brand-muted text-violet-100 hover:shadow-md",
        ),
  );
}
