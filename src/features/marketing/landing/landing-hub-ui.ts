import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";

/** Landing page shares the student hub paper desk + sticky note system. */
export const landingHub = {
  pageRoot: "lp-root mentrix-student-type-scope mx-hub-desk min-h-dvh text-[#0B1220]",

  section: "relative overflow-hidden py-16 md:py-24",
  sectionTight: "relative overflow-hidden py-10 md:py-14",
  sectionInner: "relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
  sectionInnerNarrow: "relative z-10 mx-auto max-w-3xl px-4 sm:px-6",

  eyebrow: "mx-hub-type-ui text-[#6366F1]",
  title: "text-[clamp(1.35rem,3.4vw,2.25rem)] font-bold leading-tight text-[#0B1220]",
  titleHero:
    "lp-hero-headline text-pretty font-bold italic tracking-[-0.02em] text-[#0B1220] leading-[1.1]",
  body: "text-base leading-relaxed text-[#334155]",
  bodySm: "text-sm leading-relaxed text-[#475569]",
  inkMuted: "text-[#475569]",

  stickyCard: `${mentrixHubSurfaces.stickyNote} mx-surface-light mx-hub-paper p-5 sm:p-6 shadow-[2px_4px_0_rgba(11,18,32,0.14),4px_10px_22px_-8px_rgba(11,18,32,0.28)]`,
  notebookCard: `${mentrixHubSurfaces.notebook} mx-surface-light mx-hub-paper p-5 sm:p-6`,
  heroCertificate: `${mentrixHubSurfaces.heroCertificate}`,

  navShell:
    "rounded-2xl border border-[#A5B4FC] bg-[#EDE9FE]/95 shadow-[2px_4px_0_rgba(11,18,32,0.12)] backdrop-blur-sm",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-[#6366F1] bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-[2px_3px_0_#0B1220] transition hover:bg-[#6D28D9]",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-[#6366F1] bg-[#EDE9FE] px-5 py-2.5 text-sm font-semibold text-[#4F46E5] shadow-[2px_3px_0_rgba(11,18,32,0.1)] transition hover:bg-[#DDD6FE]",

  /** Sticky note shell sized for embedded mini-games — clips dark panel, no crop outside.note */
  stickyGameNote: `${mentrixHubSurfaces.stickyNote} lp-sticky-game-note mx-surface-light mx-hub-paper mx-auto w-full max-w-[min(100%,28rem)] overflow-hidden p-3 shadow-[2px_4px_0_rgba(11,18,32,0.14),4px_10px_22px_-8px_rgba(11,18,32,0.28)] sm:p-4`,
  /** Dark inset panel for landing mini-games on paper desk. */
  gamePanel: "lp-game-panel overflow-hidden rounded-xl",
  hint: "text-[11px] font-medium text-[#475569]",
  linkBack: "text-sm font-semibold text-[#4F46E5] hover:text-[#0B1220]",
} as const;
