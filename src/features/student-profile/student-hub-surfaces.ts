/** Canvas-style hub containers — paper surfaces with ruled lines and handwriting. */
export const mentrixHubSurfaces = {
  paper: "mx-hub-paper",

  /** Rank passport strip at top of home. */
  heroCertificate:
    "mx-hub-certificate mx-hub-ruled-lines mx-hub-paper mx-surface-light relative overflow-hidden p-4 sm:p-6",

  /** Skill grid — ruled notebook page. */
  notebook: "mx-hub-notebook mx-hub-ruled-lines mx-hub-paper mx-surface-light p-4 sm:p-5 sm:p-6",

  /** Weekly receipt — sticky note with curled corner. */
  stickyNote: "mx-hub-sticky mx-hub-ruled-lines mx-hub-paper mx-surface-light p-4 sm:p-5",

  /** League rival — open book spread. */
  bookSpread: "mx-hub-book mx-hub-paper mx-surface-light overflow-hidden",

  bookPage: "mx-hub-book-page mx-hub-ruled-lines",

  /** Solid brand CTA — no gradient. */
  btnPrimary:
    "mx-hub-btn-hand inline-flex flex-col items-center gap-1 rounded-lg border border-[#6366F1] bg-[#7C3AED] px-3 py-2 text-white shadow-[2px_3px_0_#0B1220] transition hover:bg-[#6D28D9]",

  btnSolid:
    "mx-hub-btn-hand inline-flex items-center justify-center rounded-lg border border-[#6366F1] bg-[#7C3AED] px-4 py-2 text-white shadow-[2px_3px_0_#0B1220] transition hover:bg-[#6D28D9]",

  btnChip:
    "mx-hub-btn-hand inline-flex min-w-[4.5rem] flex-col items-center gap-1 rounded-md border border-[#6366F1] bg-[#EDE9FE] px-3 py-2 text-[#4F46E5] transition hover:border-[#7C3AED] hover:bg-[#DDD6FE]",

  ghostLink:
    "mx-hub-btn-hand inline-flex items-center rounded-md border border-[#6366F1] bg-[#EDE9FE] px-3 py-1.5 text-[#4F46E5] transition hover:border-[#7C3AED] hover:bg-[#DDD6FE]",

  emptyState:
    "mx-hub-empty rounded-lg border border-dashed border-[#A5B4FC] bg-[#EDE9FE]/60 px-6 py-10 text-center text-[#475569]",

  tableShell: "mx-hub-paper-table overflow-x-auto rounded-lg border border-[#C4B5FD]",

  tableHead: "border-b border-[#C4B5FD] bg-[#EEF2FF] text-left text-base font-semibold text-[#4F46E5]",

  tableRow: "border-t border-[#E0E7FF] bg-white/70 transition hover:bg-[#EDE9FE]/50",

  fieldInput:
    "min-h-11 w-full rounded-lg border border-[#A5B4FC] bg-white px-3 text-base text-[#0B1220] placeholder:text-[#94A3B8] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20",

  inkTitle: "text-2xl font-bold text-[#0B1220]",
  inkLabel: "text-lg font-semibold text-[#6366F1]",
  inkBody: "text-base text-[#334155]",
  inkMuted: "text-base text-[#475569]",

  sessionsPanel: "mx-hub-notebook mx-hub-ruled-lines mx-hub-paper mx-surface-light p-4 sm:p-6",

  guideSticky: "mx-hub-sticky mx-hub-ruled-lines mx-hub-paper mx-surface-light p-4 sm:p-5",

  /** Full-page hub canvas — ruled desk fill so gaps between cards never show bare dark shell. */
  pageDeskHub:
    "mx-hub-desk relative min-h-[calc(100dvh-4.75rem)] isolate overflow-hidden antialiased text-[#0B1220]",

  /** Arena / duel shells — dark gradient canvas. */
  pageDeskArena:
    "bg-mentrixa-app relative min-h-[calc(100dvh-4.75rem)] isolate overflow-hidden antialiased text-[#E2E8F0]",
} as const;
