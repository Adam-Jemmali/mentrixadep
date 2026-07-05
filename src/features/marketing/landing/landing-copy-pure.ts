/**
 * Landing copy — one psychological job per scroll beat.
 *
 * Arc: Pain (hero) → scale (social) → identity (who) → value stack (outcomes) →
 * urgency (now) → product proof (features) → status (ladder) → contrast (why) →
 * mechanism (loop + flow) → avatar split (path) → offer (pricing) →
 * objections (faq) → close (footer).
 *
 * Rules: one word eyebrow + one sentence body. No repeated nouns across beats.
 */

export const LANDING_HERO = {
  line1: "You study harder.",
  line2Prefix: "You still can't ",
  line2Highlight: "prove it",
  ariaLabel: "You study harder. You still can't prove it.",
  cta: "Find your gap",
  footnote: "Compete free. Card only when you book a mentor.",
} as const;

export const LANDING_SOCIAL = {
  word: "Scale",
  sentence: "Real Mentrixers. Same questions. One public scoreboard.",
} as const;

export const LANDING_STORY_BRIDGES = [
  {
    chapter: "Who",
    title: "Students",
    subtitle: "Calculus AB. First try becomes permanent.",
  },
  {
    chapter: "Now",
    title: "Stakes",
    subtitle: "Wrong standing costs months. One quest fixes it.",
  },
  {
    chapter: "Loop",
    title: "Rhythm",
    subtitle: "Four moves. Repeat until the gap closes.",
  },
] as const;

export const LANDING_OUTCOMES = {
  eyebrow: "Stack",
  title: "What you walk away with.",
  items: [
    { word: "Pack", sentence: "Call ends. Drills hit your inbox in ten minutes." },
    { word: "Drill", sentence: "Wrong node. Right set. No random pages." },
    { word: "Tree", sentence: "One subject. One board. One mentor pool." },
    { word: "Pay", sentence: "Mentor hangs up. Stripe sends the receipt." },
  ],
} as const;

export const LANDING_FEATURES = {
  eyebrow: "Arena",
  title: "Ten rooms.",
  subtitle: "Each room is one lever in the machine.",
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
  initialCoach: "Tap a badge. See where you actually stand.",
  motivation: {
    wanderer: "You showed up. Most never do.",
    seeker: "You came back. That separates you.",
    scholar: "You are in the game now.",
    contender: "Your name is on the board.",
    rival: "The top half sees you.",
    apex: "One tier from the summit.",
    mentrixer: "Proven. Public. Done.",
  },
} as const;

export const LANDING_WHY = {
  title: "The expensive mistake.",
  withoutEyebrow: "Without",
  withEyebrow: "With",
  without: [
    "Hours stack. Score never moves.",
    "Exam day is the audit. You walk in blind.",
    "Tutor apps answer. Nothing measures you.",
  ],
  with: [
    "First try records. Forever.",
    "Mentor opens your grid before minute one.",
    "Public badge rises when you do.",
  ],
} as const;

export const LANDING_FLOW_STEPS = [
  { title: "Book", line: "Three clicks. Weak spot matched to the right mentor." },
  { title: "Meet", line: "Camera on. Start exactly where you broke." },
  { title: "Unpack", line: "Ten minutes later. Your pack lands." },
  { title: "Climb", line: "XP moves. Badge updates. Share the jump." },
] as const;

export const LANDING_FLOW_GAME = {
  label: "Order",
  start: "Sort Book → Meet → Unpack → Climb.",
  success: "Locked. Same four every week.",
  retry: "Book leads. Keep sorting.",
} as const;

export const LANDING_DUAL_PATH = {
  pathHeading: "Pick a side.",
  pathSub: "Climb today. Earn tomorrow.",
  gameCoach: "Slice the side that fits you.",
  mentrixerWin: "You chose the arena.",
  guideWin: "You chose the classroom.",
  fallHint: "Tap badges as they fall.",
  playAgain: "Play again",
  signupHint: "Mini game only. Real path starts at signup.",
  sides: [
    {
      role: "Mentrixer" as const,
      title: "Climb",
      points: [
        "Calculus AB only. First tries count. Retakes don't.",
        "Quest. Duel. Public badge. Free.",
        "Hit a wall? Book someone who already sees the hole.",
      ],
      cta: "Compete free",
      href: "/auth/signup",
      tone: "blue" as const,
    },
    {
      role: "Guide" as const,
      title: "Earn",
      points: [
        "$39 per breakthrough. Flat. No haggling.",
        "You set hours. We fill the calendar. Money at hangup.",
        "AI drafts the homework pack. You approve. Send.",
      ],
      cta: "Apply as mentor",
      href: "/auth/signup?role=tutor",
      tone: "violet" as const,
    },
  ],
} as const;

export const LANDING_GUIDE_LADDER = {
  eyebrow: "Guides",
  sentence: "Impact Score replaces star ratings.",
} as const;

export const LANDING_PRICING = {
  eyebrow: "Offer",
  headline: "Three ways in.",
  subhead: "Climbing costs nothing.",
  verdict: "One session or one subscription. Your call.",
} as const;

export const LANDING_FAQ = {
  title: "Still deciding?",
  subtitle: "Mechanism, mentors, and what stays free.",
  categories: [
    {
      id: "rank",
      title: "Standing",
      items: [
        {
          id: "what-counts",
          title: "What moves my badge?",
          body: "First tries on Calculus AB nodes.",
          verdict: "Retakes never rewrite it.",
          nextAction: "Run a quest on an untouched node.",
        },
        {
          id: "percentile",
          title: "When do I get a percentile?",
          body: "After five nodes have a locked first try.",
          verdict: "Five proofs before the public number.",
          nextAction: "Clear five nodes this week.",
        },
        {
          id: "practice-again",
          title: "Can I redo a skill?",
          body: "Yes. Learning continues. Score stays frozen.",
          verdict: "Replay builds mastery, not rank.",
          nextAction: "Book a mentor on a node you already missed.",
        },
      ],
    },
    {
      id: "guides",
      title: "Mentors",
      items: [
        {
          id: "guide-impact",
          title: "What is Impact Score?",
          body: "First-try lift from your live sessions. Not stars.",
          verdict: "Same proof standard as the ladder.",
          nextAction: "Book on a node they can move.",
        },
        {
          id: "session-prep",
          title: "What does my mentor see?",
          body: "Your full grid inside two hours of start.",
          verdict: "Session opens on the real gap.",
          nextAction: "Verify nodes before you book.",
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
          body: "Arena, grid, public page, practice preview.",
          verdict: "Climbing never paywalls.",
          nextAction: "Sign up and run your first pack.",
        },
        {
          id: "subjects",
          title: "Why Calculus AB only?",
          body: "One tree, one bank, one bar for real percentiles.",
          verdict: "Depth before breadth.",
          nextAction: "Win here first.",
        },
      ],
    },
  ],
} as const;

export const LANDING_FOOTER = {
  ctaEyebrow: "Close",
  ctaTitle: "Your first try is waiting.",
  mentrixerCta: "Compete free",
  guideCta: "Earn as mentor",
  contactEyebrow: "Contact",
  contactTitle: "Broken something?",
  contactBody: "We fix it or tell you why.",
  contactButton: "Send message",
  tagline: "Calculus AB arena.",
} as const;

export const LANDING_NAV = {
  items: [
    { name: "Mechanism", link: "#flow" },
    { name: "Ladder", link: "#ranks" },
    { name: "Offer", link: "#pricing" },
    { name: "Mentors", link: "#path" },
    { name: "Contact", link: "#contact" },
    { name: "Sign in", link: "/auth/signin?signin=1" },
  ],
  mentrixerCta: "Compete free",
  guideCta: "Earn as mentor",
} as const;

export const LANDING_HERO_GAME = {
  coachStart: "40 seconds. Tap a tier, then its slot. Lowest at top.",
  timeUp: "Time. Play again.",
  pickFirst: "Pick a chip, then its slot.",
  wrongSlot: "Wrong slot. Follow the ladder.",
  locked: "Ladder locked. Nice climb.",
  lockedIn: (seconds: number) =>
    `Ladder locked in ${seconds} second${seconds === 1 ? "" : "s"}. Nice climb.`,
  spinningHint: "Ring spinning. Tap tier, then slot, before time runs out.",
  doneHint: "Mini game only. Real XP lives inside Mentrixa.",
} as const;

export const LANDING_METADATA = {
  titleSuffix: "Prove it in public",
  description:
    "Calculus AB arena. First tries set your badge. Quest, duel, book a mentor. Free to compete.",
} as const;

export type LandingFaqCategoryCopy = (typeof LANDING_FAQ.categories)[number];
export type LandingFaqItemCopy = LandingFaqCategoryCopy["items"][number];
