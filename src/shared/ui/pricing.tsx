"use client";

import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { TimelineContent } from "@/shared/ui/timeline-animation";
import { VerticalCutReveal } from "@/shared/ui/vertical-cut-reveal";
import { cn } from "@/shared/core/utils";
import { CheckCheck, Swords, Trophy, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cardHoverLift } from "@/features/marketing/landing/v2/motion/landing-motion";
import {
  formatStudentBreakthroughPrice,
  formatStudentMomentumPackPrice,
} from "@/features/booking/booking-pricing";

const MENTRIXER_GOLD = "#D4A017";

type TierCard = {
  name: string;
  tagline: string;
  priceMain: string;
  priceSub: string;
  buttonText: string;
  buttonLink: string;
  features: string[];
  popular?: boolean;
  popularBadge?: string;
  icon: React.ReactNode;
};

const TIERS: TierCard[] = [
  {
    name: "The Arena",
    tagline: "$0 forever",
    priceMain: "$0",
    priceSub: "No card. No expiry.",
    buttonText: "Start free →",
    buttonLink: "/auth/signup",
    icon: <Swords className="h-6 w-6 text-indigo-600" aria-hidden />,
    features: [
      "Rank and leaderboard per subject.",
      "Quests drill your weakest concept.",
      "Duels against real competition.",
      "Public Rank Card you can share.",
      "Free quest at mentrixa.one/try.",
    ],
  },
  {
    name: "The Breakthrough",
    tagline: "One session",
    priceMain: formatStudentBreakthroughPrice(),
    priceSub: "Live Guide plus Quest pack.",
    buttonText: "Find my Guide →",
    buttonLink: "/auth/signup",
    icon: <Zap className="h-6 w-6 text-violet-600" aria-hidden />,
    features: [
      "Everything in Arena.",
      "60 minute live Guide session.",
      "Quest pack in ten minutes.",
      "XP credited to your rank.",
    ],
  },
  {
    name: "Momentum Pack",
    tagline: "Three sessions",
    priceMain: formatStudentMomentumPackPrice(),
    priceSub: "Save $18 vs three singles.",
    buttonText: "Get Momentum Pack →",
    buttonLink: "/auth/signup",
    popular: true,
    popularBadge: "Best value",
    icon: <Trophy className="h-6 w-6" style={{ color: MENTRIXER_GOLD }} aria-hidden />,
    features: [
      "Three Guide sessions in 90 days.",
      "Same Guide across all three.",
      "Rank report after session three.",
    ],
  },
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((feature) => (
        <li key={feature} className="flex gap-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
            <CheckCheck className="h-3 w-3 text-indigo-600" aria-hidden />
          </div>
          <span className="text-sm font-medium leading-snug text-slate-600">{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function TierCardView({ tier, motionEnabled }: { tier: TierCard; motionEnabled: boolean }) {
  return (
    <motion.div className="h-full" whileHover={motionEnabled ? cardHoverLift : undefined}>
      <Card
        className={cn(
          "relative flex h-full flex-col border transition-all duration-300",
          tier.popular
            ? "overflow-hidden border-indigo-300/60 bg-white shadow-2xl shadow-indigo-500/10 ring-2 ring-indigo-500"
            : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-xl",
        )}
      >
        {tier.popularBadge ? (
          <span
            className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#0f172a]"
            style={{ backgroundColor: MENTRIXER_GOLD }}
          >
            {tier.popularBadge}
          </span>
        ) : null}

        <CardHeader className="pb-4 text-left">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm">{tier.icon}</div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
              {tier.tagline}
            </span>
          </div>
          <h3 className="text-xl font-black italic text-indigo-950">{tier.name}</h3>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-3xl font-bold tracking-tight text-slate-900">{tier.priceMain}</p>
            <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{tier.priceSub}</p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col pt-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Included
          </p>
          <FeatureList items={tier.features} />
          <div className="mt-auto border-t border-slate-100 pt-5">
            <Button
              asChild
              variant={tier.popular ? "default" : "secondary"}
              className={cn(
                "w-full rounded-xl font-bold",
                tier.popular && "bg-indigo-600 hover:bg-indigo-500",
              )}
            >
              <Link href={tier.buttonLink}>{tier.buttonText}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PricingSection() {
  const pricingRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const motionEnabled = reduceMotion !== true;

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.1, duration: 0.36 },
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
          className="absolute top-1/4 left-1/4 w-[440px] h-[440px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12),transparent_72%)]"
          animate={motionEnabled ? { x: [0, 24, 0], y: [0, -16, 0], scale: [1, 1.06, 1] } : undefined}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[440px] h-[440px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,160,23,0.08),transparent_72%)]"
          animate={motionEnabled ? { x: [0, -20, 0], y: [0, 18, 0], scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      <article className="mx-auto mb-14 max-w-3xl space-y-4 text-center">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600"
        >
          Free to compete. $39 when you need a human.
        </TimelineContent>

        <h2 className="text-4xl font-bold leading-tight tracking-tight text-indigo-950 md:text-5xl">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.1}
            staggerFrom="first"
            reverse
            containerClassName="justify-center"
            transition={{ type: "spring", stiffness: 250, damping: 40 }}
          >
            The arena is free. The breakthrough is $39.
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-base text-slate-600 md:text-lg"
        >
          Book a Guide only when the wall is real.
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-sm font-medium text-indigo-700"
        >
          Accuracy improves or the session is free.
        </TimelineContent>
      </article>

      <div className="grid gap-8 py-4 lg:grid-cols-3">
        {TIERS.map((tier, index) => (
          <TimelineContent
            key={tier.name}
            as="div"
            animationNum={2 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <TierCardView tier={tier} motionEnabled={motionEnabled} />
          </TimelineContent>
        ))}
      </div>
    </section>
  );
}
