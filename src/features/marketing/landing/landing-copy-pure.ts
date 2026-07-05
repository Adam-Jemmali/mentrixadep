/**
 * Mentrixa landing copy — long-term: any skill node, verified first try, live public feed.
 * Launch subject: AP Calculus AB (named wherever the product is live today).
 */

/** Shared launch + long-term framing. */
export const LANDING_SCOPE = {
  launchSubject: "AP Calculus AB",
  launchShort: "Calculus AB",
  /** Universal unit — every future subject uses the same mechanic. */
  node: "skill node",
  longTerm: "Any skill. Same proof bar. Calculus AB first.",
} as const;

export const LANDING_HERO = {
  line1: "Sports have live boards.",
  line2Prefix: "Learning ",
  line2Highlight: "never did",
  ariaLabel: "Sports have live boards. Learning never did.",
  cta: "Watch live",
  footnote: "Any skill node. Calculus AB first. Public.",
} as const;

export const LANDING_SOCIAL = {
  word: "Watch",
  sentence: "Any skill node. First-try accuracy. Calculus AB live now.",
} as const;

export const LANDING_STORY_BRIDGES = [
  {
    chapter: "Who",
    title: "Mentrixers",
    subtitle: "Any skill. Calculus AB first. First try locks.",
  },
  {
    chapter: "Open",
    title: "Public",
    subtitle: "Live feed per skill node. Open to the internet.",
  },
  {
    chapter: "Loop",
    title: "Loop",
    subtitle: "Quest. Guide. Climb again.",
  },
] as const;

export const LANDING_OUTCOMES = {
  eyebrow: "Proof",
  title: "Four outcomes.",
  items: [
    { word: "Feed", sentence: "Live standings on every skill node." },
    { word: "Passport", sentence: "Public URL. Server verified." },
    { word: "Pack", sentence: "Guide session drills in ten minutes." },
    { word: "Guide", sentence: "Live breakthrough on your gap." },
  ],
} as const;

export const LANDING_FEATURES = {
  eyebrow: "Surfaces",
  title: "Ten rooms.",
  subtitle: "Any skill node. Calculus AB live today.",
  polaroidTitles: [
    "Duels",
    "League",
    "Quest",
    "Passport",
    "Impact",
    "Wars",
    "Session",
    "Pack",
    "Studio",
    "Breakthrough",
  ] as const,
} as const;

/** Account XP tiers — not the live node feed. */
export const LANDING_RANK_LADDER = {
  eyebrow: "Climb",
  title: "Seven XP tiers.",
  bubbleLabel: "XP ladder",
  initialCoach: "Account tier. Separate from the live feed.",
  motivation: {
    wanderer: "You entered.",
    seeker: "You returned.",
    scholar: "You compete.",
    contender: "Name visible.",
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

export const LANDING_FLOW_STEPS = [
  { title: "Book", line: "Guide matched to your verified gap." },
  { title: "Meet", line: "Live. They read your record first." },
  { title: "Unpack", line: "Quest pack lands in ten minutes." },
  { title: "Climb", line: "Feed moves. XP tier may rise." },
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
  pathHeading: "Two paths.",
  pathSub: "Compete on the feed. Teach for impact.",
  gameCoach: "Slice Mentrixer or Guide.",
  gameLabel: "Pick",
  mentrixerWin: "Mentrixer path.",
  guideWin: "Guide path.",
  fallHint: "Tap icons as they fall.",
  playAgain: "Again",
  signupHint: "Demo only. Live feed at signup.",
  sides: [
    {
      role: "Mentrixer" as const,
      title: "Compete",
      points: [
        "Any skill node. Calculus AB live. First tries only.",
        "Quest. Duel. Public passport. Free.",
        "Stuck? Guide sees your record before join.",
      ],
      cta: "Start free",
      href: "/auth/signup",
      tone: "blue" as const,
    },
    {
      role: "Guide" as const,
      title: "Teach",
      points: [
        "$39 flat per breakthrough session.",
        "Set hours. Stripe pays at hangup.",
        "Studio drafts pack. You approve and send.",
      ],
      cta: "Apply as Guide",
      href: "/auth/signup?role=tutor",
      tone: "violet" as const,
    },
  ],
} as const;

export const LANDING_GUIDE_LADDER = {
  eyebrow: "Guides",
  sentence: "Impact Score tracks first-try lift. Not stars.",
} as const;

export const LANDING_PRICING = {
  eyebrow: "Offer",
  headline: "Three tiers.",
  subhead: "Live feed stays free.",
  verdict: "Breakthrough session or Momentum.",
} as const;

export const LANDING_FAQ = {
  title: "Questions?",
  subtitle: "Verified tries, Guides, access.",
  categories: [
    {
      id: "rank",
      title: "Standing",
      items: [
        {
          id: "what-counts",
          title: "What moves rank?",
          body: "Verified first tries on any live skill node. Calculus AB today.",
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
          nextAction: "Book a Guide on a node you already missed.",
        },
      ],
    },
    {
      id: "guides",
      title: "Guides",
      items: [
        {
          id: "guide-impact",
          title: "What is Impact Score?",
          body: "First-try lift from your live sessions.",
          verdict: "Same proof category as Mentrixer rank.",
          nextAction: "Book on a node you can still move.",
        },
        {
          id: "session-prep",
          title: "What does my Guide see?",
          body: "Your verified record before the session starts.",
          verdict: "Call opens on the real gap.",
          nextAction: "Lock first tries before you book.",
        },
      ],
    },
    {
      id: "access",
      title: "Access",
      items: [
        {
          id: "free-tier",
          title: "What is free?",
          body: "Arena, live feed, passport, practice preview.",
          verdict: "Verified standing never paywalls.",
          nextAction: "Sign up. Lock your first try.",
        },
        {
          id: "subjects",
          title: "Why Calculus AB first?",
          body: "Any skill can join later. Each needs a reviewed bank and enough first tries for real ranks.",
          verdict: "Calculus AB proves the model first.",
          nextAction: "Win here. Next skill same bar.",
        },
      ],
    },
  ],
} as const;

export const LANDING_FOOTER = {
  ctaEyebrow: "Start",
  ctaTitle: "Lock what is true today.",
  mentrixerCta: "Start free",
  guideCta: "Apply as Guide",
  contactEyebrow: "Contact",
  contactTitle: "Something broken?",
  contactBody: "We read every message.",
  contactButton: "Send message",
  tagline: "Any skill node. Calculus AB live. Verified first tries.",
} as const;

export const LANDING_NAV = {
  items: [
    { name: "Live", link: "#features" },
    { name: "Climb", link: "#ranks" },
    { name: "Offer", link: "#pricing" },
    { name: "Guides", link: "#path" },
    { name: "Contact", link: "#contact" },
    { name: "Sign in", link: "/auth/signin?signin=1" },
  ],
  mentrixerCta: "Start free",
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
  doneHint: "Demo only. Live feed inside.",
  playAgain: "Again",
  timeLabel: "Time",
  xpLabel: "XP",
  placed: (count, total) => `${count}/${total} placed`,
};

export const LANDING_METADATA = {
  titleSuffix: "Live verified standings",
  description:
    "Live public feed for verified first tries on any skill node. Starting AP Calculus AB. Quest, duel, Guide. Free.",
} as const;

export type LandingFaqCategoryCopy = (typeof LANDING_FAQ.categories)[number];
export type LandingFaqItemCopy = LandingFaqCategoryCopy["items"][number];
