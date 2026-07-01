import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";

/**
 * Shared layout tokens for student-facing pages.
 * Logo palette only on product routes — no white containers.
 */
export const mentrixStudent = {
  pageBgHub:
    "relative min-h-screen isolate overflow-hidden antialiased text-white",

  pageBg:
    "mx-shell-workbench relative min-h-screen isolate overflow-hidden antialiased text-white before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.06] before:content-['']",

  pageBgArena:
    "mx-shell-arena relative min-h-screen isolate overflow-hidden antialiased text-white before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.05] before:content-['']",

  main: "max-w-7xl mx-auto px-4 sm:px-6 py-8",
  mainWide: "max-w-6xl mx-auto px-4 sm:px-6 py-8",
  mainSlim: "max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10",

  /** Logo-gradient panel — default card on product surfaces. */
  card: `${mentrixBrandUi.panel} rounded-2xl text-violet-50`,
  cardWorkbench: "mx-panel-workbench rounded-2xl text-white",
  cardArena: "mx-panel-arena rounded-2xl text-white",
  cardMuted: `${mentrixBrandUi.panelMuted} rounded-2xl text-violet-100`,

  heroGradient:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#312e81_0%,#1e1b4b_42%,#0B1220_100%)] text-white shadow-[0_20px_44px_-26px_rgba(124,58,237,0.45)] before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:118px_118px] before:bg-repeat before:opacity-[0.06] before:content-['']",

  heroGradientLite:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#312e81_0%,#1e1b4b_42%,#0B1220_100%)] text-white shadow-[0_20px_44px_-26px_rgba(124,58,237,0.45)]",

  sectionEyebrow: mentrixProfileType.labelOnDark,
  sectionEyebrowOnLight: mentrixProfileType.labelOnDark,

  pageTitle: mentrixProfileType.pageTitleOnDark,
  pageSubtitle: mentrixProfileType.pageSubtitleOnDark,

  textOnLight: mentrixProfileType.cardTitleOnDark,
  textMutedOnLight: mentrixProfileType.bodyItalicOnDark,
  textOnDark: "font-black text-white",
  textMutedOnDark: mentrixProfileType.bodyItalicOnDark,

  cardTitle: mentrixProfileType.cardTitleOnDark,
  cardTitleOnDark: mentrixProfileType.cardTitleOnDark,

  pillPrimary:
    "mx-cta-primary inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-4 py-2 text-xs font-black uppercase italic tracking-[0.14em] text-white shadow-md shadow-violet-600/25",
  pillGhost: mentrixBrandUi.heroBtnOutline,
} as const;

export { mentrixProfileType, mentrixBrandUi };
