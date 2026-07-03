import { mentrixProfileType } from "@/features/student-profile/mentrix-profile-typography";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";

/**
 * Shared layout tokens for student-facing pages.
 * Logo palette only on product routes — no white containers.
 */
export const mentrixStudent = {
  pageBgHub: mentrixHubSurfaces.pageDesk,

  pageBg: mentrixHubSurfaces.pageDesk,

  pageBgArena: mentrixHubSurfaces.pageDesk,

  main: "max-w-7xl mx-auto px-4 sm:px-6 py-8",
  mainWide: "max-w-6xl mx-auto px-4 sm:px-6 py-8",
  mainSlim: "max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10",

  pageHeader: `${mentrixHubSurfaces.notebook} p-5 sm:p-6`,

  /** Default product card — ruled notebook page. */
  card: mentrixHubSurfaces.notebook,
  cardWorkbench: mentrixHubSurfaces.notebook,
  cardArena: mentrixHubSurfaces.stickyNote,
  cardMuted: `${mentrixHubSurfaces.stickyNote} rotate-0`,

  heroGradient:
    mentrixHubSurfaces.heroCertificate,

  hubHero: mentrixHubSurfaces.heroCertificate,
  hubNotebook: mentrixHubSurfaces.notebook,
  hubSticky: mentrixHubSurfaces.stickyNote,
  hubBook: mentrixHubSurfaces.bookSpread,
  hubBookPage: mentrixHubSurfaces.bookPage,
  hubBtn: mentrixHubSurfaces.btnPrimary,
  hubBtnSolid: mentrixHubSurfaces.btnSolid,
  hubBtnChip: mentrixHubSurfaces.btnChip,
  hubGhostLink: mentrixHubSurfaces.ghostLink,
  hubEmpty: mentrixHubSurfaces.emptyState,
  hubTableShell: mentrixHubSurfaces.tableShell,
  hubTableHead: mentrixHubSurfaces.tableHead,
  hubTableRow: mentrixHubSurfaces.tableRow,
  hubFieldInput: mentrixHubSurfaces.fieldInput,
  hubSessionsPanel: mentrixHubSurfaces.sessionsPanel,
  hubGuideSticky: mentrixHubSurfaces.guideSticky,

  heroGradientLite: mentrixHubSurfaces.heroCertificate,

  sectionEyebrow: mentrixHubSurfaces.inkLabel,
  sectionEyebrowOnLight: mentrixHubSurfaces.inkLabel,

  pageTitle: mentrixHubSurfaces.inkTitle,
  pageSubtitle: mentrixHubSurfaces.inkBody,

  textOnLight: "font-black text-[#0B1220]",
  textMutedOnLight: mentrixHubSurfaces.inkMuted,
  textOnDark: "font-black text-[#0B1220]",
  textMutedOnDark: mentrixHubSurfaces.inkMuted,

  cardTitle: mentrixHubSurfaces.inkTitle,
  cardTitleOnDark: mentrixHubSurfaces.inkTitle,

  pillPrimary: mentrixHubSurfaces.btnSolid,
  pillGhost: mentrixHubSurfaces.ghostLink,

  chipActive:
    "inline-flex min-h-9 items-center rounded-lg border border-[#6366F1] bg-[#7C3AED] px-3 text-base font-semibold text-white shadow-[2px_2px_0_#0B1220]",
  chipIdle:
    "inline-flex min-h-9 items-center rounded-lg border border-[#A5B4FC] bg-white px-3 text-base font-semibold text-[#4F46E5] hover:bg-[#EDE9FE]",
} as const;

export { mentrixProfileType, mentrixBrandUi };
