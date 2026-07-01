import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";

/**
 * Shared layout tokens for student-facing pages.
 * Typography matches profile Identity Management surfaces.
 */
export const mentrixStudent = {
  /** Hub home: shell already paints `bg-mentrixa-app` — skip repeating logo.webp (LCP + decode contention). */
  pageBgHub:
    "relative min-h-screen isolate overflow-hidden antialiased text-white",

  pageBg:
    "mx-shell-workbench relative min-h-screen isolate overflow-hidden antialiased text-white before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.06] before:content-['']",

  pageBgArena:
    "mx-shell-arena relative min-h-screen isolate overflow-hidden antialiased text-white before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.05] before:content-['']",

  main: "max-w-7xl mx-auto px-4 sm:px-6 py-8",
  mainWide: "max-w-6xl mx-auto px-4 sm:px-6 py-8",
  mainSlim: "max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10",

  /** White card — profile dark text. */
  card: "mx-surface-light rounded-2xl",
  cardWorkbench: "mx-panel-workbench rounded-2xl text-white",
  cardArena: "mx-panel-arena rounded-2xl text-white",
  cardMuted: "mx-surface-light rounded-2xl border border-violet-200 bg-violet-50/40 text-indigo-950",

  heroGradient:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] text-white shadow-[0_20px_44px_-26px_rgba(2,6,23,0.72)] before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:118px_118px] before:bg-repeat before:opacity-[0.05] before:content-['']",

  heroGradientLite:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] text-white shadow-[0_20px_44px_-26px_rgba(2,6,23,0.72)]",

  sectionEyebrow: mentrixProfileType.labelOnDark,
  sectionEyebrowOnLight: mentrixProfileType.label,

  pageTitle: mentrixProfileType.pageTitleOnDark,
  pageSubtitle: mentrixProfileType.pageSubtitleOnDark,

  textOnLight: "font-black text-indigo-950",
  textMutedOnLight: mentrixProfileType.bodyItalic,
  textOnDark: "font-black text-white",
  textMutedOnDark: mentrixProfileType.bodyItalicOnDark,

  cardTitle: mentrixProfileType.cardTitle,
  cardTitleOnDark: mentrixProfileType.cardTitleOnDark,

  pillPrimary: "mx-cta-primary inline-flex items-center justify-center px-4 py-2 text-xs font-black uppercase italic tracking-[0.14em]",
  pillGhost:
    "inline-flex items-center justify-center rounded-xl border border-violet-400/50 bg-violet-950/50 px-4 py-2 text-xs font-black uppercase italic tracking-[0.14em] text-violet-100 transition hover:bg-violet-900/60",
} as const;

export { mentrixProfileType };
