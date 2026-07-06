/** Guide home (`/tutor`) — short copy only. */

export const GUIDE_HOME = {
  heroTagline: "Calculus AB. Impact from first tries.",
  btnProficiency: "AB proficiency",
  btnProfile: "Profile",
  btnAddSlots: "Add slots",
  slotsToastTitle: "Slots live",
  slotsToastSub: "Scrolling to open slots…",
  metrics: {
    monthEarnings: "Month earnings",
    sessionsWeek: "Sessions week",
    avgRating: "Avg rating",
    responseRate: "Response rate",
    requests: "Requests",
  },
  lateCancelTitle: "Late cancel",
  lateCancelBody: "Within 24h. Check Stripe refund.",
  impactTrendTitle: "Impact trend · 30d",
  impactScoreTitle: "Impact Score",
  requestsTitle: "Requests",
  bookedRequestsTitle: "Booked requests",
  earningsTitle: "Earnings · 30d",
  earningsCaption: "Posts when session ends.",
  weekScheduleTitle: "Week schedule",
  weekScheduleSub: "Slots this week.",
  openSlotsTitle: "Open slots",
  autoApprove: "Auto-approve",
  mobileRequests: "Requests",
  mobileEarnings: "Earnings",
} as const;

export const GUIDE_PROFICIENCY = {
  eyebrow: "Proficiency",
  intro: "Calculus AB only. Proof once. Slots after verify.",
  verified: "Verified",
  pending: "Pending",
  slotsLocked: "Slots locked until verified.",
  remove: "Remove",
  masteryLabel: "Mastery proof",
  masteryPlaceholder: "AP 5, TA terms, coaching record",
  evidenceLabel: "Evidence",
  evidencePlaceholder: "https:// transcript or certificate",
  evidenceOrUpload: "or upload PDF/image:",
  submit: "Submit proficiency",
  submitting: "Submitting…",
  errMastery: "Add mastery proof.",
  errEvidence: "Add link or file.",
  errBoth: "Link or file, not both.",
  errSubmit: "Submit failed.",
  errRemove: "Remove failed.",
} as const;

export const GUIDE_AVAILABILITY_FORM = {
  title: "Open slots",
  subtitle: "Schedule and price",
  subjectLabel: "Subject",
  verifiedNote: "Verified. Bookable for AB learners.",
  unverifiedNote: "Verify AB proficiency on home first.",
  blockedNote: "Not verified. Finish AB card on home.",
  daysLabel: "Days",
  sessionEndLabel: "Ends",
  durationNote: (min: number) => `${min} min fixed. Profile → Teaching Defaults.`,
  repeatTitle: "Repeat weekly",
  repeatSub: "Keep slots open each week",
  repeatFor: "Repeat",
  weeks: "weeks",
  priceLabel: "Price CAD",
  timezoneLabel: "Timezone",
  previewCta: "Review",
  previewHint: "Confirm next.",
  reviewTitle: "Confirm",
  backEdit: "Back",
  youSelected: "Selected",
  daysIncluded: "Days",
  timezoneNote: (tz: string) => `Timezone ${tz}. Learners see local time.`,
  confirmCta: "Create slots",
  creating: "Creating…",
  success: (n: number) => `Created ${n} slot${n === 1 ? "" : "s"}.`,
  errVerify: "Verify AB proficiency first.",
  errDays: "Pick a day.",
  errPrice: "Enter price.",
  errPriceRange: (min: number, max: number) => `$${min}–$${max} CAD.`,
  errWeeks: "1–52 weeks.",
  errCreate: "Create failed.",
  oneWeek: "One week",
  recurringWeeks: (n: string) => `${n} weeks`,
} as const;

export const GUIDE_PAYOUTS = {
  title: "Payouts",
  subtitle: "CAD via Stripe. Share after each AB session.",
  stripeReady: "Stripe ready",
  stripeFinish: "Finish Stripe onboarding",
  stripeConnect: "Connect Stripe for session share",
  stripeCadNote: "Learners pay CAD. Platform fee stays. Rest to your Stripe.",
  connectedAccount: "Connected",
  checklist: "Checklist",
  continueStripe: "Continue Stripe",
  openExpress: "Open Stripe",
  balanceBtn: "Stripe balance",
  noTransactions: "No transactions yet",
  noTransactionsSub: "Completed sessions appear here.",
  history: "History",
  available: "Available",
  availableCaption: "Express balance",
  queued: "Queued",
  queuedCaption: "Completing sessions",
  awaiting: "Awaiting",
  awaitingCaption: "Ledger pending",
  lifetime: "Lifetime",
  lifetimeCaption: "Net recorded",
  queuedNote:
    "Share lands on Connect after payment. Ledger updates when session ends.",
  successBanner: "Stripe updated. Paid bookings open when charges and payouts enable.",
  incompleteBanner: "Stripe needs more info. Continue setup.",
  errorBanner: "Stripe link failed. Try again.",
  unavailableBanner: "Connect not enabled on platform. Finish in Stripe Dashboard.",
  tableSession: "Session",
  tableLearner: "Learner",
  tableCourse: "Course",
  tableGross: "Gross",
  tableFee: "Fee",
  tableNet: "Net",
  tableStatus: "Status",
} as const;

export const GUIDE_DEMAND = {
  eyebrow: "Demand",
  title: "Where needed",
  noSlots: (subject: string) => `No slots for ${subject}.`,
  addSlot: "Add slot",
} as const;

export function guideDemandRowLine(nodeName: string, count: number): string {
  return `${nodeName} weak for ${count} learner${count === 1 ? "" : "s"}`;
}

export function guideDemandVerdict(nodeName: string): string {
  return `${nodeName} needs you most this week.`;
}

export const GUIDE_DEMAND_EMPTY_VERDICT = "No demand signal yet.";
export const GUIDE_DEMAND_EMPTY_ACTION = "Verify AB proficiency first.";
export function guideDemandOpenSlotAction(subject: string): string {
  return `Open ${subject} slot.`;
}
export const GUIDE_DEMAND_COVERED_ACTION = "Slots cover this week's demand.";

export const GUIDE_NOTIFICATIONS = {
  title: "Notifications",
  subtitle: "Post-session retest results.",
  new: (n: number) => `${n} new`,
} as const;

export const GUIDE_PRE_SESSION = {
  title: "Pre-session",
  subtitle: "Unlocks 2h before call.",
} as const;

export const GUIDE_RANK = {
  eyebrow: "Guide rank",
  progressTo: (label: string) => `To ${label}`,
} as const;

export const GUIDE_SLOTS_MANAGER = {
  empty: "No open slots.",
  hidden: "Hidden",
  pendingBooking: (n: number) => `${n} pending`,
  active: "Active",
  delete: "Delete",
  deleteTitle: "Delete slot?",
  deletePending: (n: number) =>
    `${n} pending request${n === 1 ? "" : "s"}. Decline first.`,
  deleteConfirm: "Removes slot from calendar.",
  cancel: "Cancel",
  deleteCta: "Delete",
  errUpdate: "Update failed.",
  errDelete: "Delete failed.",
} as const;

export const GUIDE_REQUESTS_LIST = {
  syncing: "Syncing…",
  refundNote: "Decline refunds learner.",
  empty: "No requests.",
  requestedTime: "Time",
  accepting: "Accepting…",
  declining: "Declining…",
  accept: "Accept",
  decline: "Decline",
} as const;
