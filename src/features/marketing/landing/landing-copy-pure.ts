/**
 * Mentrixa landing copy — long-term any skill node; Calculus AB live first.
 *
 * Role split (never merge):
 * - Mentrixer: verified first tries → live feed + Mentrixer rank + passport.
 * - Guide: live sessions → Impact Score + Guide rank + Stripe payout.
 */

export const LANDING_SCOPE = {
  launchSubject: "AP Calculus AB",
  launchShort: "Calculus AB",
  node: "skill node",
  longTerm: "Any skill. Same proof bar. Calculus AB first.",
} as const;

export const LANDING_ROLES = {
  mentrixer: {
    label: "Mentrixer",
    proof: "Mentrixer rank from verified first tries.",
    rankLabel: "Mentrixer rank",
  },
  guide: {
    label: "Guide",
    proof: "Guide Impact Score from first-try lift.",
    rankLabel: "Guide Impact Score",
  },
} as const;

export const LANDING_HERO = {
  line1: "Sports have live boards.",
  line2Prefix: "Learning ",
  line2Highlight: "never did",
  ariaLabel: "Sports have live boards. Learning never did.",
  cta: "Watch live",
  footnote: "Mentrixers climb. Guides earn. Calculus AB first.",
} as const;

export const LANDING_SOCIAL = {
  word: "Watch",
  sentence: "Mentrixer names on the feed. First tries only. Calculus AB live.",
} as const;

export const LANDING_STORY_BRIDGES = [
  {
    chapter: "Mentrixer",
    title: "Climb",
    subtitle: "Quest. Duel. Live feed. First try locks.",
  },
  {
    chapter: "Open",
    title: "Public",
    subtitle: "Not a profile stat. A feed anyone can open.",
  },
  {
    chapter: "Guide",
    title: "Earn",
    subtitle: "Live sessions. Impact Score. Separate proof.",
  },
] as const;

/** Mentrixer receipts only — Guides have their own block under #path. */
export const LANDING_OUTCOMES = {
  eyebrow: "Mentrixer",
  title: "Four proofs.",
  items: [
    { word: "Feed", sentence: "Live standings on every skill node." },
    { word: "Passport", sentence: "Public URL for your Mentrixer rank." },
    { word: "Quest", sentence: "Verified first tries from the item bank." },
    { word: "Duel", sentence: "Same node. Same first question. Head to head." },
  ],
} as const;

export const LANDING_FEATURES = {
  title: "Two roles.",
  subtitle: "Mentrixer rank and Guide impact. Never the same score.",
  mentrixer: {
    eyebrow: "Mentrixer",
    title: "Five tools.",
    subtitle: "Compete on the live feed.",
    polaroidTitles: ["Duels", "League", "Quest", "Passport", "Wars"] as const,
  },
  guide: {
    eyebrow: "Guide",
    title: "Five tools.",
    subtitle: "Preview below. Full breakdown in Guide section.",
    polaroidTitles: ["Session", "Studio", "Pack", "Impact", "Breakthrough"] as const,
  },
} as const;

/** Mentrixer XP tiers — not Guide Impact. */
export const LANDING_RANK_LADDER = {
  eyebrow: "Mentrixer",
  title: "Seven XP tiers.",
  bubbleLabel: "Mentrixer XP",
  initialCoach: "Account tier. Not Guide Impact.",
  motivation: {
    wanderer: "You entered.",
    seeker: "You returned.",
    scholar: "You compete.",
    contender: "On the feed.",
    rival: "Top half sees you.",
    apex: "One tier left.",
    mentrixer: "Proven in public.",
  },
} as const;

export const LANDING_WHY = {
  title: "Two worlds.",
  withoutEyebrow: "Before",
  withEyebrow: "Mentrixa",
  without: [
    "Any skill. Hours alone. No live board.",
    "Score on a profile. Hidden from the world.",
    "Retakes feel like you improved.",
  ],
  with: [
    "One first try per skill node. Locked.",
    "Calculus AB live now. Every skill same bar.",
    "Public feed. Retakes never move it.",
  ],
} as const;

/** Mentrixer loop — includes booking a Guide, not becoming one. */
export const LANDING_FLOW = {
  eyebrow: "Mentrixer loop",
  title: "Four steps.",
  subtitle: "Book a Guide when stuck. Not the Guide career path.",
} as const;

export const LANDING_FLOW_STEPS = [
  { title: "Book", line: "Pick a Guide for your verified gap." },
  { title: "Meet", line: "Live call. They read your record first." },
  { title: "Unpack", line: "Quest pack lands in ten minutes." },
  { title: "Climb", line: "Feed moves. Mentrixer XP may rise." },
] as const;

export const LANDING_FLOW_GAME = {
  label: "Order",
  start: "Sort Book → Meet → Unpack → Climb.",
  success: "Locked. Same loop every week.",
  retry: "Book leads.",
  dragHint: "Drag rows or use arrow keys.",
  lockedChip: "Locked",
  dragChip: "Drag",
  shuffleAgain: "Shuffle again",
} as const;

export const LANDING_DUAL_PATH = {
  pathHeading: "Two roles.",
  pathSub: "Mentrixer rank or Guide impact. Pick one path.",
  gameCoach: "Tap Mentrixer or Guide icon.",
  gameLabel: "Role",
  mentrixerWin: "You picked Mentrixer.",
  guideWin: "You picked Guide.",
  fallHint: "Tap icons as they fall.",
  playAgain: "Again",
  signupHint: "Demo only. Sign up for your role.",
  sides: [
    {
      role: "Mentrixer" as const,
      title: "Climb rank",
      points: [
        "Quest. Duel. Live feed. First tries only.",
        "Public passport. Free.",
        "Book a Guide when a node stays red.",
      ],
      cta: "Start as Mentrixer",
      href: "/auth/signup",
      tone: "blue" as const,
    },
    {
      role: "Guide" as const,
      title: "Earn impact",
      points: [
        "$39 breakthrough sessions. Stripe at hangup.",
        "Studio drafts Quest packs from your calls.",
        "Impact Score climbs Practitioner to Elite.",
      ],
      cta: "Apply as Guide",
      href: "/auth/signup?role=tutor",
      tone: "violet" as const,
    },
  ],
} as const;

export const LANDING_GUIDE_LADDER = {
  eyebrow: "Guide only",
  title: "Impact ladder.",
  sentence: "Practitioner to Elite. First-try lift. Not Mentrixer rank.",
} as const;

/** Dedicated Guide explainer — role, tools, dashboard access. */
export const LANDING_GUIDE = {
  eyebrow: "Guide",
  title: "What Guides do.",
  subtitle: "Live teachers on Mentrixa. Impact Score proof. Never Mentrixer rank.",
  definition: {
    word: "Role",
    sentence: "Guides run live breakthrough sessions when a Mentrixer hits a verified gap on Calculus AB.",
  },
  notRank: "Guides do not climb the Mentrixer feed or XP ladder.",
  featuresTitle: "Five tools.",
  featuresSubtitle: "What you run every session.",
  features: [
    { word: "Session", sentence: "Live video call. You read their verified record before you speak." },
    { word: "Studio", sentence: "Transcript becomes a Quest pack. You approve before send." },
    { word: "Pack", sentence: "Practice items land in their hub within ten minutes of hangup." },
    { word: "Impact", sentence: "Your score moves when their first tries improve on nodes you taught." },
    { word: "Breakthrough", sentence: "$39 flat per session. Stripe pays when the call ends." },
  ] as const,
  accessTitle: "Dashboard access.",
  accessSubtitle: "What you get after approval.",
  access: [
    { word: "Hub", sentence: "Session requests, earnings, and impact trend in one command center." },
    { word: "Stripe", sentence: "Connect once. Payout hits when the breakthrough session ends." },
    { word: "Schedule", sentence: "Set availability slots. Accept requests or auto-approve." },
    { word: "Profile", sentence: "Public Guide page with Impact Score and rank badge." },
    { word: "Studio", sentence: "Draft, review, and ship Quest packs from every call." },
  ] as const,
  verdict: "Guide Impact and Mentrixer rank carry equal weight. Different proof.",
  cta: "Apply as Guide",
  href: "/auth/signup?role=tutor",
} as const;

export const LANDING_PRICING = {
  eyebrow: "Mentrixer offer",
  headline: "Three tiers.",
  subhead: "Live feed stays free.",
  verdict: "Guides earn per session. Mentrixers pick a tier.",
} as const;

export const LANDING_FAQ = {
  title: "Questions?",
  subtitle: "Mentrixers, Guides, access.",
  categories: [
    {
      id: "rank",
      title: "Mentrixers",
      items: [
        {
          id: "what-counts",
          title: "What moves Mentrixer rank?",
          body: "Verified first tries on live skill nodes. Calculus AB today.",
          verdict: "Practice after first encounter never rewrites it.",
          nextAction: "Run a quest on an untouched node.",
        },
        {
          id: "percentile",
          title: "When am I on the feed?",
          body: "After five nodes have a locked first try.",
          verdict: "Five proofs before a public percentile.",
          nextAction: "Clear five nodes this week.",
        },
        {
          id: "practice-again",
          title: "Can I redo a node?",
          body: "Yes. You learn. Your first try stays frozen.",
          verdict: "Replay builds mastery, not rank.",
          nextAction: "Book a Guide on a missed node.",
        },
      ],
    },
    {
      id: "guides",
      title: "Guides",
      items: [
        {
          id: "guide-impact",
          title: "What is Guide Impact Score?",
          body: "First-try lift on skills you taught live.",
          verdict: "Guide proof. Not Mentrixer rank.",
          nextAction: "Apply as Guide to build impact.",
        },
        {
          id: "guide-pay",
          title: "How do Guides get paid?",
          body: "$39 flat per breakthrough session.",
          verdict: "Stripe pays when the call ends.",
          nextAction: "Set hours and connect Stripe.",
        },
        {
          id: "guide-studio",
          title: "What is Studio?",
          body: "Turns session transcript into a Quest pack.",
          verdict: "You review before send. Not live AI coaching.",
          nextAction: "Apply as Guide to use Studio.",
        },
        {
          id: "guide-access",
          title: "What do Guides get access to?",
          body: "Guide hub, Stripe payouts, availability calendar, Studio, and public Impact profile.",
          verdict: "Separate dashboard. Never mixed with Mentrixer rank tools.",
          nextAction: "Apply as Guide to open your hub.",
        },
      ],
    },
    {
      id: "access",
      title: "Access",
      items: [
        {
          id: "free-tier",
          title: "What is free for Mentrixers?",
          body: "Arena, live feed, passport, practice preview.",
          verdict: "Mentrixer standing never paywalls.",
          nextAction: "Sign up. Lock your first try.",
        },
        {
          id: "subjects",
          title: "Why Calculus AB first?",
          body: "Any skill can join later. Each needs a reviewed bank and enough first tries.",
          verdict: "Calculus AB proves the model first.",
          nextAction: "Win here. Next skill same bar.",
        },
      ],
    },
  ],
} as const;

export const LANDING_FOOTER = {
  ctaEyebrow: "Start",
  ctaTitle: "Pick a role. Lock proof today.",
  mentrixerCta: "Start as Mentrixer",
  guideCta: "Apply as Guide",
  contactEyebrow: "Contact",
  contactTitle: "Something broken?",
  contactBody: "We read every message.",
  contactButton: "Send message",
  tagline: "Mentrixers climb rank. Guides earn impact. Calculus AB live.",
} as const;

export const LANDING_NAV = {
  items: [
    { name: "Mentrixer", link: "#features" },
    { name: "Climb", link: "#ranks" },
    { name: "Offer", link: "#pricing" },
    { name: "Guide", link: "#guide" },
    { name: "Path", link: "#path" },
    { name: "Contact", link: "#contact" },
    { name: "Sign in", link: "/auth/signin?signin=1" },
  ],
  mentrixerCta: "Start as Mentrixer",
  guideCta: "Apply as Guide",
} as const;

export type LandingHeroGameCopy = {
  coachStart: string;
  timeUp: string;
  pickFirst: string;
  wrongSlot: string;
  locked: string;
  lockedIn: (seconds: number) => string;
  spinningHint: string;
  doneHint: string;
  playAgain: string;
  timeLabel: string;
  xpLabel: string;
  placed: (count: number, total: number) => string;
};

export const LANDING_HERO_GAME: LandingHeroGameCopy = {
  coachStart: "40s. Tap tier, then slot. Lowest at top.",
  timeUp: "Time. Again.",
  pickFirst: "Chip first. Slot second.",
  wrongSlot: "Wrong slot.",
  locked: "Locked.",
  lockedIn: (seconds: number) => `Locked in ${seconds}s.`,
  spinningHint: "Tap tier, then slot.",
  doneHint: "Demo only. Mentrixer feed inside.",
  playAgain: "Again",
  timeLabel: "Time",
  xpLabel: "XP",
  placed: (count, total) => `${count}/${total} placed`,
};

export const LANDING_METADATA = {
  titleSuffix: "Live verified standings",
  description:
    "Mentrixers climb a live first-try feed. Guides earn Impact Score. Calculus AB first. Free to compete.",
} as const;

export type LandingFaqCategoryCopy = (typeof LANDING_FAQ.categories)[number];
export type LandingFaqItemCopy = LandingFaqCategoryCopy["items"][number];
