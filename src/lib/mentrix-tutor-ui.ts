/**
 * Shared layout tokens for tutor-facing pages.
 * Mirroring the student's premium design system for consistency.
 */
export const mentrixTutor = {
  pageBg:
    "relative min-h-screen isolate overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.07),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(30,58,138,0.05),transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fbff_46%,#eef6fb_100%)] text-slate-900 antialiased before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:112px_112px] before:bg-repeat before:opacity-[0.085] before:content-['']",
  main: "max-w-7xl mx-auto px-4 sm:px-6 py-8",
  /** Primary elevated panel with subtle, production-grade depth. */
  card:
    "rounded-2xl border border-slate-200 bg-white shadow-[0_6px_18px_-12px_rgba(15,23,42,0.22)]",
  cardMuted:
    "rounded-2xl border border-slate-200 bg-slate-50/70 shadow-[0_4px_14px_-10px_rgba(15,23,42,0.18)]",
  heroGradient:
    "relative overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#1e3a8a_0%,#2563eb_45%,#3b82f6_100%)] text-white shadow-[0_20px_44px_-26px_rgba(30,58,138,0.55)] before:pointer-events-none before:absolute before:inset-0 before:bg-[url('/mentrixalogo/logo.webp')] before:bg-[length:118px_118px] before:bg-repeat before:opacity-[0.065] before:content-['']",
  sectionEyebrow: "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400",
  pageTitle: "text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl",
  pageSubtitle: "mt-2 text-sm text-slate-600 max-w-xl leading-relaxed",
} as const;
