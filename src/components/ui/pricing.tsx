"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { Calendar, CheckCheck, GraduationCap, Video, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cardHoverLift } from "@/components/landing/v2/motion/landing-motion";

type SessionPhaseVisual = {
  phase: string;
  image: string;
  icon: React.ReactNode;
  bullets: string[];
};

type PricingCard = {
  name: string;
  roleTag: string;
  whoItsFor: string;
  description: string;
  priceMain: string;
  priceSub: string;
  priceNote?: string;
  buttonText: string;
  buttonLink: string;
  icon: React.ReactNode;
  features: string[];
  sessionPhases?: SessionPhaseVisual[];
  popular?: boolean;
  popularBadge?: string;
  compact?: boolean;
};

function FeatureList({
  items,
  className,
  twoColumn,
}: {
  items: string[];
  className?: string;
  twoColumn?: boolean;
}) {
  return (
    <ul className={cn(twoColumn ? "grid gap-2 sm:grid-cols-2" : "space-y-2", className)}>
      {items.map((feature) => (
        <li key={feature} className="flex gap-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
            <CheckCheck className="h-3 w-3 text-blue-600" aria-hidden />
          </div>
          <span className="text-sm font-medium leading-snug text-slate-600">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function SessionJourneyVisual({ phases }: { phases: SessionPhaseVisual[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {phases.map((block, i) => (
        <div
          key={block.phase}
          className={cn(
            "relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-b p-3",
            i === 0 && "border-slate-200 from-slate-50 to-white",
            i === 1 && "border-orange-200/90 from-orange-50/80 to-white",
            i === 2 && "border-emerald-200/90 from-emerald-50/60 to-white",
          )}
        >
          {i < phases.length - 1 ? (
            <span
              className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-slate-300 sm:block lg:hidden"
              aria-hidden
            />
          ) : null}
          <div className="relative mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl border border-white/80 bg-white shadow-sm">
            <Image src={block.image} alt="" width={36} height={36} className="object-contain" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white shadow">
              {block.icon}
            </span>
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-700">{block.phase}</p>
          <ul className="mt-2 space-y-1.5">
            {block.bullets.map((line) => (
              <li key={line} className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-slate-600">
                <CheckCheck className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PricingCardView({ card, motionEnabled }: { card: PricingCard; motionEnabled: boolean }) {
  return (
    <motion.div className="h-full" whileHover={motionEnabled ? cardHoverLift : undefined}>
      <Card
        className={cn(
          "relative flex h-full flex-col border border-slate-200 transition-all duration-300",
          card.popular
            ? "overflow-hidden bg-white shadow-2xl shadow-blue-500/10 ring-2 ring-blue-500"
            : "bg-white hover:shadow-xl",
        )}
      >
        {card.popularBadge && !card.compact ? (
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {card.popularBadge}
          </span>
        ) : null}

        <CardHeader className={cn("pb-4 text-left", card.compact && "pb-3")}>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm">{card.icon}</div>
            {card.roleTag ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {card.roleTag}
              </span>
            ) : null}
          </div>

          {card.compact ? (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{card.name}</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">{card.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tracking-tight text-slate-900">{card.priceMain}</p>
                <p className="text-xs text-slate-500">{card.priceSub}</p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900">{card.name}</h3>
              <p className="mt-1 text-xs font-semibold text-indigo-600">{card.whoItsFor}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{card.description}</p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-3xl font-bold tracking-tight text-slate-900">{card.priceMain}</p>
                <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{card.priceSub}</p>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col pt-0">
          {card.sessionPhases ? (
            <div className="mb-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Everything included in one session price
              </p>
              <SessionJourneyVisual phases={card.sessionPhases} />
              {card.features.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Everything that happens in one session
                  </p>
                  <FeatureList items={card.features} twoColumn />
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Everything you get
              </p>
              <FeatureList items={card.features} className="mb-8" />
            </>
          )}

          <div className="mt-auto border-t border-slate-100 pt-5">
            <Button asChild variant={card.popular ? "default" : "secondary"} className="w-full">
              <Link href={card.buttonLink}>{card.buttonText}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const LEARNER_AND_GUIDE_CARDS: PricingCard[] = [
  {
    name: "Free forever",
    roleTag: "For every learner",
    whoItsFor: "The full competitive arena. No card. No trial. No expiry. Free because the game should be accessible to every learner on earth.",
    description: "You never pay to practice, compete, or climb your division. The arena is free forever. You pay only when you book a live Guide session and want to break through a specific wall with you.",
    priceMain: "$0",
    priceSub: "Free forever. The ranked world is yours.",
    buttonText: "Start competing free →",
    buttonLink: "/auth/signup",
    icon: (
      <div className="relative h-6 w-6 shrink-0">
        <Image src="/icons/mentrixer.svg" alt="" fill className="object-contain" sizes="24px" />
      </div>
    ),
    features: [
      "Compete in any subject — add as many as you want",
      "Unlimited daily quests calibrated to your weak spots",
      "Head-to-head duels against learners at your level",
      "A public rank that updates after every action",
      "XP that compounds across every skill you add",
      "Clan competition — team XP and weekly challenges",
      "A profile that shows your rank history — not just your current score",
      "Try a quest before creating your account",
      "Guide sessions are optional — compete free forever and only book when you need a breakthrough",
    ],
  },
  {
    name: "Earn from what you know",
    roleTag: "For experts who teach",
    whoItsFor: "Your knowledge is worth more than what you are currently charging for it. Mentrixa gives you the infrastructure to prove it.",
    description: "Free to apply. You earn when learners book you. You set subjects, rate, and hours.",
    priceMain: "You set your rate",
    priceSub: "$15 to $60 CAD per session · typical range",
    buttonText: "Apply to teach on Mentrixa →",
    buttonLink: "/auth/signup?role=tutor",
    icon: (
      <div className="relative h-6 w-6 shrink-0">
        <Image src="/icons/guide.svg" alt="" fill className="object-contain" sizes="24px" />
      </div>
    ),
    features: [
      "Free to apply. You pay nothing to be listed.",
      "Add every subject you are qualified to teach. No limits.",
      "Your rate. Your hours. Nothing books without your confirmation.",
      "Learners search by subject and find you. Your profile shows your rating and response rate.",
      "Live video, screen share, and digital whiteboard — all in the browser. Zero downloads.",
      "Quest drafts the session package the moment the call ends. Summary, flashcards, drills.",
      "You review in three minutes and send. The admin disappears. The teaching stays.",
      "Stripe pays you automatically after every session. No invoicing. No follow-up. No waiting.",
      "You keep 85%. Mentrixa takes 15% to run the platform, the booking, and the payments.",
    ],
  },
];

const LIVE_SESSION_CARD: PricingCard = {
  name: "Book a Guide",
  roleTag: "When the game is not enough",
  whoItsFor: "",
  description:
    "One price. The booking, the live session, and your Quest follow-up pack are all inside it. You see the full price before you click Book. No add-ons at checkout. No surprise at checkout. The 15% platform fee is already in the number your Guide displays.",
  priceMain: "$15 to $60",
  priceSub: "per session · set by each Guide",
  buttonText: "Browse Guides →",
  buttonLink: "/auth/signup",
  icon: <GraduationCap className="text-orange-500" size={24} aria-hidden />,
  popular: true,
  compact: true,
  features: [
    "Search verified Guides by subject",
    "See full rate on their profile before you pay",
    "Pick a time slot and pay once on Stripe",
    "Confirmation email plus join link in your dashboard",
    "Private 1 on 1 video call with your Guide",
    "Screen share so they see your exact problem",
    "Live teaching until you break through the wall",
    "Written session summary from Quest",
    "Flashcards built from your call",
    "Practice drills on your weak spots",
    "XP added to your division climb",
    "Session package saved to reopen anytime",
    "15% platform fee already in the price you see",
  ],
  sessionPhases: [
    {
      phase: "Before you meet",
      image: "/images/book.webp",
      icon: <Calendar className="h-3.5 w-3.5 text-indigo-600" aria-hidden />,
      bullets: [
        "Browse Guides who teach your subject",
        "Read profile, skills, and reviews",
        "See the full hourly rate before checkout",
        "Book an open slot on their calendar",
        "Pay once through Stripe",
        "Get reminders and your video join link",
      ],
    },
    {
      phase: "In the session",
      image: "/images/live.webp",
      icon: <Video className="h-3.5 w-3.5 text-orange-600" aria-hidden />,
      bullets: [
        "Private 1 on 1 video session",
        "Screen share your work or question",
        "Your Guide sees your quest and duel history before the session. They know where you broke before you say a word.",
        "You stay until the concept clicks. Not until the timer runs out.",
      ],
    },
    {
      phase: "After you hang up",
      image: "/images/package.webp",
      icon: <Zap className="h-3.5 w-3.5 text-emerald-600" aria-hidden />,
      bullets: [
        "Quest generates your session summary within 10 minutes of hanging up.",
        "Flashcards from what you covered",
        "Custom practice drills on weak spots",
        "XP credited to your rank",
        "Full pack saved in your account",
      ],
    },
  ],
};

const PRICING_STEPS = [
  { step: "1", title: "Join free", body: "Create your account in two minutes. Your division rank starts at zero. Every quest moves it." },
  { step: "2", title: "Compete daily. Always free.", body: "Quests, duels, divisions, and leaderboards cost nothing. The rank compounds every time you show up." },
  {
    step: "3",
    title: "Book a Guide when the game is not enough.",
    body: "When you hit a wall you cannot break through alone, one session with the right Guide closes the gap. The pack drops immediately after you hang up.",
  },
];

export default function PricingSection() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const motionEnabled = reduceMotion !== true;

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.12, duration: 0.36 },
    }),
    hidden: { y: 12, opacity: 0 },
  };

  return (
    <section
      className="relative mx-auto min-h-screen max-w-7xl overflow-hidden px-4 py-24"
      id="pricing"
      ref={pricingRef}
    >
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[440px] h-[440px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.10),transparent_72%)]"
          animate={motionEnabled ? { x: [0, 24, 0], y: [0, -16, 0], scale: [1, 1.06, 1] } : undefined}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[440px] h-[440px] rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.10),transparent_72%)]"
          animate={motionEnabled ? { x: [0, -20, 0], y: [0, 18, 0], scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      <article className="mx-auto mb-10 max-w-3xl space-y-6 text-center">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600"
        >
          Free to compete. You pay only when you need a Guide.
        </TimelineContent>

        <h2 className="text-4xl font-bold leading-tight tracking-tight text-blue-600 md:text-5xl">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.1}
            staggerFrom="first"
            reverse
            containerClassName="justify-center"
            transition={{ type: "spring", stiffness: 250, damping: 40 }}
          >
            2 roles. 1 clean model. The game is free. The Guide is optional.
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-base leading-relaxed text-slate-600 md:text-lg"
        >
          You never pay to practice, compete, or climb your division. The arena is free forever for every skill
          you take seriously. You pay only when you book a live Guide session  and want to break through a specific wall with you. That session includes the call, the AI Quest personalized pack, and the XP.
          One price. Nothing hidden.
        </TimelineContent>
      </article>

      <TimelineContent
        animationNum={2}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="mx-auto mb-12 grid max-w-4xl gap-3 sm:grid-cols-3"
      >
        {PRICING_STEPS.map((item) => (
          <div
            key={item.step}
            className="rounded-xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-sm backdrop-blur-sm"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Step {item.step}</span>
            <p className="mt-1 text-sm font-bold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </TimelineContent>

      <div className="grid gap-8 py-6 md:grid-cols-2 lg:grid-cols-6">
        {LEARNER_AND_GUIDE_CARDS.map((card, index) => (
          <TimelineContent
            key={card.name}
            as="div"
            animationNum={3 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="lg:col-span-3"
          >
            <PricingCardView card={card} motionEnabled={motionEnabled} />
          </TimelineContent>
        ))}

        <TimelineContent
          as="div"
          animationNum={5}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="md:col-span-2 lg:col-span-6"
        >
          <PricingCardView card={LIVE_SESSION_CARD} motionEnabled={motionEnabled} />
        </TimelineContent>
      </div>
 
      <TimelineContent
        animationNum={7}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="mt-20 border-t border-slate-100 pt-16"
      >
        <h3 className="mb-2 text-center text-2xl font-bold text-purple-900 md:text-3xl">For organizations</h3>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-slate-600 md:text-base">
          Universities, bootcamps, corporate teams and certification bodies license Mentrixa for their cohorts.
          Every learner gets the full arena. You get the dashboard, the progress reports, and the outcome data.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Free", price: "$0 / mo", students: "Up to 10 learners · Pilot cohort", sessions: "5 live sessions / mo", features: "Basic dashboard" },
            { name: "Basic", price: "$299 / mo", students: "Up to 50 learners · Monthly progress reports · Priority support", sessions: "100 sessions / mo", features: "Reports and priority support" },
            { name: "Pro", price: "$999 / mo", students: "Unlimited learners · Custom branding · API access · SSO", sessions: "Unlimited sessions", features: "Branding, API, SSO" },
            { name: "Enterprise", price: "Custom", students: "Custom everything · Dedicated success manager · SLA", sessions: "Custom volume", features: "Dedicated success manager" },
          ].map((tier) => (
            <motion.div
              key={tier.name}
              whileHover={motionEnabled ? { y: -6, scale: 1.02 } : undefined}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-lg"
            >
              <h4 className="text-lg font-bold text-slate-900">{tier.name}</h4>
              <p className="mt-1 text-2xl font-bold text-blue-600">{tier.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>{tier.students}</li>
                <li>{tier.sessions}</li>
                <li>{tier.features}</li>
              </ul>
              <Button asChild variant="secondary" className="mt-6 w-full">
                <Link href={tier.name === "Enterprise" ? "/contact" : "/auth/signup"}>
                  {tier.name === "Enterprise" ? "Contact us" : "Get started"}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </TimelineContent>
    </section>
  );
}
