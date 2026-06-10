/**

 * Shared layout tokens for student-facing pages.

 * Contrast-first: white/zinc on light surfaces, white/violet on dark shells.

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

  /** White card — dark zinc text. */

  card: "mx-surface-light rounded-2xl",

  cardWorkbench: "mx-panel-workbench rounded-2xl text-white",

  cardArena: "mx-panel-arena rounded-2xl text-white",

  cardMuted: "mx-surface-light rounded-2xl border border-violet-200 bg-violet-50/40 text-zinc-950",

  heroGradient:

    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] text-white shadow-[0_20px_44px_-26px_rgba(2,6,23,0.72)] before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:118px_118px] before:bg-repeat before:opacity-[0.05] before:content-['']",

  /** Dashboard hero: gradient only (nav mark is the LCP image). */
  heroGradientLite:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0f172a_0%,#1e1b4b_45%,#111827_100%)] text-white shadow-[0_20px_44px_-26px_rgba(2,6,23,0.72)]",

  sectionEyebrow:

    "text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300",

  sectionEyebrowOnLight:

    "text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700",

  pageTitle: "text-2xl font-bold tracking-tight text-white sm:text-3xl",

  pageSubtitle: "mt-2 text-sm text-violet-100 max-w-xl leading-relaxed",

  textOnLight: "text-zinc-950",

  textMutedOnLight: "text-zinc-600",

  textOnDark: "text-white",

  textMutedOnDark: "text-violet-200",

  pillPrimary: "mx-cta-primary inline-flex items-center justify-center px-4 py-2 text-sm font-semibold",

  pillGhost:

    "inline-flex items-center justify-center rounded-xl border border-violet-400/50 bg-violet-950/50 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-900/60",

} as const;

