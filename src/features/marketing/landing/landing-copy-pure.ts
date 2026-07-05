/**
 * Landing copy — one word + one sentence per beat. No repeated nouns.
 */

export const LANDING_HERO = {
  line1: "You grind.",
  line2Prefix: "Can't ",
  line2Highlight: "prove it",
  ariaLabel: "You grind. Can't prove it.",
  cta: "Find gap",
  footnote: "Free. Card on mentor only.",
} as const;

export const LANDING_SOCIAL = {
  word: "Scale",
  sentence: "Same questions. One scoreboard.",
} as const;

export const LANDING_STORY_BRIDGES = [
  {
    chapter: "Who",
    title: "Students",
    subtitle: "Calculus AB. First try sticks.",
  },
  {
    chapter: "Now",
    title: "Stakes",
    subtitle: "Wrong standing costs months. One quest.",
  },
  {
    chapter: "Loop",
    title: "Rhythm",
    subtitle: "Four moves. Gap closes.",
  },
] as const;

export const LANDING_OUTCOMES = {
  eyebrow: "Stack",
  title: "Four receipts.",
  items: [
    { word: "Pack", sentence: "Drills in ten minutes." },
    { word: "Drill", sentence: "Weak node. Right set." },
    { word: "Tree", sentence: "One tree. One board." },
    { word: "Pay", sentence: "Stripe at hangup." },
  ],
} as const;

export const LANDING_FEATURES = {
  eyebrow: "Arena",
  title: "Ten rooms.",
  subtitle: "One lever each.",
  polaroidTitles: [
    "Duels",
    "League",
    "Quest",
    "Rank",
    "Impact",
    "Wars",
    "Room",
    "Pack",
    "Studio",
    "Breakthrough",
  ] as const,
} as const;

export const LANDING_RANK_LADDER = {
  eyebrow: "Status",
  title: "Seven ranks. One mirror.",
  bubbleLabel: "Truth",
  initialCoach: "Tap. See truth.",
  motivation: {
    wanderer: "You showed.",
    seeker: "You returned.",
    scholar: "You're in.",
    contender: "On the board.",
    rival: "Top sees you.",
    apex: "One left.",
    mentrixer: "Proven. Public.",
  },
} as const;

export const LANDING_WHY = {
  title: "The mistake.",
  withoutEyebrow: "Without",
  withEyebrow: "With",
  without: [
    "Hours stack. Nothing moves.",
    "Exam audits you blind.",
    "Apps answer. Never measure.",
  ],
  with: [
    "First try sticks.",
    "Mentor sees grid first.",
    "Badge rises with you.",
  ],
} as const;

export const LANDING_FLOW_STEPS = [
  { title: "Book", line: "Weak spot matched to mentor." },
  { title: "Meet", line: "Start where you broke." },
  { title: "Unpack", line: "Pack lands in ten." },
  { title: "Climb", line: "XP moves. Badge updates." },
] as const;

export const LANDING_FLOW_GAME = {
  label: "Order",
  start: "Sort Book → Meet → Unpack → Climb.",
  success: "Locked. Same four weekly.",
  retry: "Book leads.",
} as const;

export const LANDING_DUAL_PATH = {
  pathHeading: "Pick a side.",
  pathSub: "Climb today. Earn tomorrow.",
  gameCoach: "Slice your side.",
  mentrixerWin: "Arena path.",
  guideWin: "Classroom path.",
  fallHint: "Tap falling badges.",
  playAgain: "Again",
  signupHint: "Demo only. Sign up to climb.",
  sides: [
    {
      role: "Mentrixer" as const,
      title: "Climb",
      points: [
        "Calculus AB. First tries only.",
        "Quest. Duel. Public badge. Free.",
        "Stuck? Book a mentor who sees the hole.",
      ],
      cta: "Compete free",
      href: "/auth/signup",
      tone: "blue" as const,
    },
    {
      role: "Guide" as const,
      title: "Earn",
      points: [
        "$39 flat per session.",
        "Set hours. We book. Paid at hangup.",
        "AI drafts pack. You approve.",
      ],
      cta: "Apply as mentor",
      href: "/auth/signup?role=tutor",
      tone: "violet" as const,
    },
  ],
} as const;

export const LANDING_GUIDE_LADDER = {
  eyebrow: "Guides",
  sentence: "Impact beats star ratings.",
} as const;

export const LANDING_PRICING = {
  eyebrow: "Offer",
  headline: "Three tiers.",
  subhead: "Climbing free.",
  verdict: "Session or subscription.",
} as const;

export const LANDING_FAQ = {
  title: "Deciding?",
  subtitle: "Mechanism, mentors, access.",
  categories: [
    {
      id: "rank",
      title: "Standing",
      items: [
        {
          id: "what-counts",
          title: "What moves badge?",
          body: "Calculus AB first tries.",
          verdict: "Retakes don't count.",
          nextAction: "Quest an untouched node.",
        },
        {
          id: "percentile",
          title: "When percentile?",
          body: "After five locked first tries.",
          verdict: "Five proofs for public number.",
          nextAction: "Clear five nodes.",
        },
        {
          id: "practice-again",
          title: "Redo a skill?",
          body: "Yes. Learn more. Score frozen.",
          verdict: "Replay ≠ reroll.",
          nextAction: "Book mentor on missed node.",
        },
      ],
    },
    {
      id: "guides",
      title: "Mentors",
      items: [
        {
          id: "guide-impact",
          title: "Impact Score?",
          body: "First-try lift from sessions.",
          verdict: "Not stars. Proof.",
          nextAction: "Book on movable node.",
        },
        {
          id: "session-prep",
          title: "What mentor sees?",
          body: "Full grid two hours before.",
          verdict: "Starts at real gap.",
          nextAction: "Verify nodes first.",
        },
      ],
    },
    {
      id: "access",
      title: "Access",
      items: [
        {
          id: "free-tier",
          title: "What's free?",
          body: "Arena, grid, page, preview.",
          verdict: "Climbing never paywalls.",
          nextAction: "Sign up. Run first pack.",
        },
        {
          id: "subjects",
          title: "Why Calculus AB?",
          body: "One tree. One bank. Real percentiles.",
          verdict: "Depth before breadth.",
          nextAction: "Win here first.",
        },
      ],
    },
  ],
} as const;

export const LANDING_FOOTER = {
  ctaEyebrow: "Close",
  ctaTitle: "First try waiting.",
  mentrixerCta: "Compete free",
  guideCta: "Earn as mentor",
  contactEyebrow: "Contact",
  contactTitle: "Broken?",
  contactBody: "We fix it.",
  contactButton: "Send",
  tagline: "Calculus AB arena.",
} as const;

export const LANDING_NAV = {
  items: [
    { name: "Loop", link: "#flow" },
    { name: "Ladder", link: "#ranks" },
    { name: "Offer", link: "#pricing" },
    { name: "Mentors", link: "#path" },
    { name: "Contact", link: "#contact" },
    { name: "Sign in", link: "/auth/signin?signin=1" },
  ],
  mentrixerCta: "Compete free",
  guideCta: "Earn as mentor",
} as const;

/** Game coach strings — typed as plain strings so state can swap messages. */
export type LandingHeroGameCopy = {
  coachStart: string;
  timeUp: string;
  pickFirst: string;
  wrongSlot: string;
  locked: string;
  lockedIn: (seconds: number) => string;
  spinningHint: string;
  doneHint: string;
};

export const LANDING_HERO_GAME: LandingHeroGameCopy = {
  coachStart: "40s. Tap tier, then slot. Lowest top.",
  timeUp: "Time. Again.",
  pickFirst: "Chip first. Slot second.",
  wrongSlot: "Wrong slot.",
  locked: "Locked. Nice.",
  lockedIn: (seconds: number) => `Locked in ${seconds}s.`,
  spinningHint: "Tap tier, then slot.",
  doneHint: "Demo only. Real XP inside.",
};

export const LANDING_METADATA = {
  titleSuffix: "Prove it public",
  description: "Calculus AB arena. First tries set badge. Quest, duel, mentor. Free.",
} as const;

export type LandingFaqCategoryCopy = (typeof LANDING_FAQ.categories)[number];
export type LandingFaqItemCopy = LandingFaqCategoryCopy["items"][number];
