/** Logo palette accents for the student home hub — solid ink on paper surfaces. */
export type HubAccent = "violet" | "indigo" | "cyan" | "navy";

export const mentrixHubAccent = {
  valueDark: {
    violet: "text-[#C4B5FD]",
    indigo: "text-[#A5B4FC]",
    cyan: "text-[#22D3EE]",
    navy: "text-white",
  },
  valueLight: {
    violet: "text-[#7C3AED]",
    indigo: "text-[#6366F1]",
    cyan: "text-[#0891B2]",
    navy: "text-[#0B1220]",
  },
  labelDark: {
    violet: "text-violet-300/90",
    indigo: "text-indigo-300/90",
    cyan: "text-cyan-300/85",
    navy: "text-slate-300/85",
  },
  labelLight: {
    violet: "text-[#6D28D9]",
    indigo: "text-[#4F46E5]",
    cyan: "text-[#0E7490]",
    navy: "text-[#475569]",
  },
  iconBackdropDark: {
    violet: "rounded-lg bg-violet-500/15 p-1 ring-1 ring-violet-400/35",
    indigo: "rounded-lg bg-indigo-500/15 p-1 ring-1 ring-indigo-400/35",
    cyan: "rounded-lg bg-cyan-500/12 p-1 ring-1 ring-cyan-400/30",
    navy: "rounded-lg bg-[#0B1220]/70 p-1 ring-1 ring-indigo-500/30",
  },
  iconBackdropLight: {
    violet: "rounded-lg bg-violet-100 p-1 ring-1 ring-violet-300",
    indigo: "rounded-lg bg-indigo-100 p-1 ring-1 ring-indigo-300",
    cyan: "rounded-lg bg-cyan-100 p-1 ring-1 ring-cyan-300",
    navy: "rounded-lg bg-slate-100 p-1 ring-1 ring-slate-300",
  },
  heroTitle: "font-bold text-[#0B1220] text-3xl sm:text-4xl",
  subjectTitle: "font-bold text-[#6366F1] text-xl sm:text-2xl",
  verdictLead: "font-semibold text-[#4F46E5]",
  verdictHighlight: "font-black text-[#0891B2]",
} as const;

export function hubAccentValueClass(accent: HubAccent | undefined, surface: "dark" | "light"): string {
  if (!accent) {
    return surface === "dark" ? "text-violet-50" : "text-zinc-900";
  }
  return surface === "dark" ? mentrixHubAccent.valueDark[accent] : mentrixHubAccent.valueLight[accent];
}

export function hubAccentLabelClass(accent: HubAccent | undefined, surface: "dark" | "light"): string {
  if (!accent) {
    return surface === "dark" ? "text-violet-200/90" : "text-zinc-600";
  }
  return surface === "dark" ? mentrixHubAccent.labelDark[accent] : mentrixHubAccent.labelLight[accent];
}

export function hubAccentBackdropClass(accent: HubAccent | undefined, surface: "dark" | "light"): string | undefined {
  if (!accent) return undefined;
  return surface === "dark" ? mentrixHubAccent.iconBackdropDark[accent] : mentrixHubAccent.iconBackdropLight[accent];
}
