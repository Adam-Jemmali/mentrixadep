/** Mentrixa logo palette — violet, indigo, navy only (gold reserved for verified truth). */
export const MENTRIXA_BRAND = {
  violet: "#7C3AED",
  indigo: "#6366F1",
  navy: "#0B1220",
  navyDeep: "#0F172A",
  cyan: "#22D3EE",
} as const;

/** Tailwind-friendly UI tokens for student product surfaces (no white shells). */
export const mentrixBrandUi = {
  panel: "mx-panel-brand",
  panelMuted: "mx-panel-brand-muted",
  border: "border-violet-500/30",
  borderSubtle: "border-indigo-500/25",
  input:
    "h-10 border-violet-500/30 bg-[#0B1220]/70 pl-9 text-sm text-violet-50 placeholder:text-violet-300/45 focus-visible:border-violet-400/60 focus-visible:ring-violet-500/25",
  chipActive:
    "border-violet-400/70 bg-gradient-to-br from-[#7C3AED] to-[#6366F1] text-white shadow-md shadow-violet-600/25",
  chipIdle:
    "border-indigo-500/30 bg-indigo-950/50 text-violet-100 hover:border-violet-400/45 hover:bg-violet-950/60",
  tableShell: "overflow-x-auto rounded-2xl border border-indigo-500/25 bg-indigo-950/35",
  tableHead: "border-b border-indigo-500/30 bg-violet-950/50 text-left text-xs font-black uppercase tracking-widest text-indigo-300",
  tableRow: "border-t border-indigo-500/15 bg-transparent transition hover:bg-violet-600/10",
  ghostBtn:
    "inline-flex items-center rounded-lg border border-indigo-500/35 bg-indigo-950/50 px-3 text-xs font-black uppercase italic tracking-widest text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-900/40",
  emptyState: "rounded-2xl border border-dashed border-violet-500/30 bg-violet-950/25 px-6 py-12 text-center",
  heroBtn:
    "inline-flex min-h-11 items-center rounded-xl border border-violet-400/50 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-4 text-xs font-black uppercase italic tracking-widest text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110",
  heroBtnOutline:
    "inline-flex min-h-11 items-center rounded-xl border border-violet-400/40 bg-violet-950/40 px-4 text-xs font-black uppercase italic tracking-widest text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-900/50",
} as const;
