/**
 * Profile-parity typography (Identity Management / Cipher passport).
 * Geist sans: font-black labels, italic body emphasis, mono stats.
 */
export const mentrixProfileType = {
  /** DISPLAY NAME, TEMPORAL FOCUS */
  label: "text-[10px] font-black uppercase tracking-widest text-indigo-400",
  labelMuted: "text-[10px] font-black uppercase tracking-widest text-slate-400",
  labelOnDark: "text-[10px] font-black uppercase tracking-widest text-indigo-300",

  /** IDENTITY MANAGEMENT */
  sectionTitle: "text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950",
  sectionTitleSm: "text-xs font-black uppercase tracking-[0.25em] text-indigo-950",
  sectionTitleOnDark: "text-[11px] font-black uppercase tracking-[0.25em] text-indigo-100",

  /** Hero / page titles */
  pageTitle: "text-2xl font-black italic tracking-tight text-indigo-950 sm:text-3xl",
  pageTitleOnDark: "text-2xl font-black italic tracking-tight text-white sm:text-3xl",
  pageTitleDisplay: "text-2xl font-black italic tracking-tight text-zinc-100 sm:text-4xl",

  pageSubtitle: "text-sm font-medium italic text-slate-500 max-w-xl leading-relaxed",
  pageSubtitleOnDark: "text-sm font-medium italic text-violet-100/90 max-w-xl leading-relaxed",

  body: "text-sm font-medium text-slate-600",
  bodyOnDark: "text-sm font-medium text-violet-100/90",
  bodyItalic: "text-sm font-medium italic text-slate-400",
  bodyItalicOnDark: "text-sm font-medium italic text-violet-200/80",

  cardTitle: "text-base font-black uppercase tracking-[0.12em] text-indigo-950",
  cardTitleOnDark: "text-base font-black uppercase tracking-[0.12em] text-white",

  statLabel: "text-[10px] font-black uppercase tracking-widest text-slate-400",
  statLabelOnDark: "text-[10px] font-black uppercase tracking-widest text-indigo-300",
  statValue: "font-mono text-sm font-black text-indigo-900 tabular-nums",
  statValueLg: "font-mono text-2xl font-black text-indigo-900 tabular-nums",

  link: "text-xs font-black uppercase tracking-widest text-indigo-600 transition hover:text-indigo-800",
  linkOnDark: "text-xs font-black uppercase tracking-widest text-indigo-300 transition hover:text-indigo-100",

  cta: "text-xs font-black uppercase italic tracking-[0.2em]",
  ctaPrimary:
    "inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-black uppercase italic tracking-[0.14em] text-white transition hover:bg-indigo-500",
  ctaSecondary:
    "inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 text-xs font-black uppercase italic tracking-[0.14em] text-indigo-900 transition hover:bg-indigo-100",

  /** Wrapper class — applied on home / skills / quest / league / duel routes */
  scope: "mentrix-student-type-scope",
} as const;
