"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { ACCOUNT_RANK_VISUALS, normalizeRankTitle, type AccountRankKey } from "@/features/xp/rank-icons";
import { RankBadge, RankTitle } from "@/features/student-profile/ui/rank-badge";
import { staggerContainer, viewportOnce, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { cn } from "@/shared/core/utils";
import {
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingEyebrow } from "@/features/marketing/landing/ui/landing-eyebrow";
import { LandingStickyGameNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_E, LANDING_RANK_LADDER } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";

const HeroRankStage = dynamic(
  () =>
    import("@/features/marketing/landing/v2/hero/hero-rank-stage").then((m) => m.HeroRankStage),
  {
    ssr: false,
    loading: () => (
      <BklitShimmer className="h-[280px] w-full rounded-lg" aria-label="Loading rank mini game" />
    ),
  },
);

const RANK_MOTIVATION: Record<AccountRankKey, string> = LANDING_RANK_LADDER.motivation;

export function RankLadderShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  useLandingNumericReveal(sectionRef);
  const { cinematic, mounted, reduced } = useLandingMotion();
  const isInView = useInView(sectionRef, { amount: 0.35, once: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollDriving, setScrollDriving] = useState(false);
  const scrollPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const scrollIndex = useTransform(scrollYProgress, [0.2, 0.75], [0, ACCOUNT_RANK_VISUALS.length - 1]);

  useMotionValueEvent(scrollIndex, "change", (v) => {
    if (reduced || !cinematic) return;
    const next = Math.round(v);
    if (next >= 0 && next < ACCOUNT_RANK_VISUALS.length) {
      setActiveIndex(next);
      setScrollDriving(true);
      if (scrollPauseRef.current) clearTimeout(scrollPauseRef.current);
      scrollPauseRef.current = setTimeout(() => setScrollDriving(false), 1200);
    }
  });

  useEffect(() => {
    if (!isInView || reduced || !cinematic || scrollDriving) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % ACCOUNT_RANK_VISUALS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [isInView, reduced, cinematic, scrollDriving]);

  useEffect(() => {
    return () => {
      if (scrollPauseRef.current) clearTimeout(scrollPauseRef.current);
    };
  }, []);

  const [coachMessage, setCoachMessage] = useState<string>(LANDING_RANK_LADDER.initialCoach);
  const active = ACCOUNT_RANK_VISUALS[activeIndex]!;

  useEffect(() => {
    setCoachMessage(
      `${normalizeRankTitle(active.title)}. ${active.minXp.toLocaleString()} to ${
        active.maxXp != null ? active.maxXp.toLocaleString() : "∞"
      } XP. ${RANK_MOTIVATION[active.key]}`,
    );
  }, [active.key, active.title, active.minXp, active.maxXp]);

  return (
    <section id="ranks" ref={sectionRef} className={landingHub.sectionTight}>
      <div className={landingHub.sectionInner}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <LandingNumberHeading
            eyebrow={LANDING_RANK_LADDER.eyebrow}
            count={ACCOUNT_RANK_VISUALS.length}
            suffix="tiers"
          />
        </motion.div>

        <LandingSpeechBubble
          message={coachMessage}
          tone="coach"
          label={LANDING_RANK_LADDER.bubbleLabel}
          className="mx-auto mt-6"
        />

        <LandingStickyCard rotate={false} variant="pinned" className={cn(LP_NUM.card, "mx-auto mt-6 max-w-lg rotate-[0.25deg] opacity-0")}>
          <div className="flex flex-col items-center gap-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, scale: 0.82, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, y: -16, filter: "blur(6px)" }}
                transition={springSoft}
                className="flex flex-col items-center gap-3 text-center"
              >
                <RankBadge
                  rank={active}
                  size="xl"
                  active
                  surface="light"
                  showGlow={mounted && (active.key === "mentrixer" || active.key === "apex")}
                  priority
                />
                <RankTitle rank={active} tone="light" className={cn("text-lg font-bold text-[#0B1220]", landingHub.title)} />
                <p className={`text-xs font-medium tabular-nums ${landingHub.inkMuted}`}>
                  {active.minXp.toLocaleString()} XP
                  {active.maxXp != null ? ` to ${active.maxXp.toLocaleString()} XP` : "+"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </LandingStickyCard>

        <div className="relative mt-6 flex w-full gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:justify-center lg:overflow-visible">
          {ACCOUNT_RANK_VISUALS.map((rank, i) => {
            const isActive = i === activeIndex;

            return (
              <motion.button
                key={rank.key}
                type="button"
                onClick={() => setActiveIndex(i)}
                layout
                whileHover={cinematic ? { y: -6, scale: 1.04 } : undefined}
                whileTap={cinematic ? { scale: 0.97 } : undefined}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  opacity: isActive ? 1 : 0.92,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className={cn(
                  "group relative flex shrink-0 snap-center cursor-pointer flex-col items-center gap-2 p-3",
                  isActive && "ring-2 ring-[#6366F1]",
                )}
                aria-pressed={isActive}
                aria-label={normalizeRankTitle(rank.title)}
              >
                <LandingStickyNote
                  variant={landingStickyVariantForIndex(i + 2)}
                  className={cn(
                    LP_NUM.card,
                    "relative flex flex-col items-center gap-2 overflow-hidden p-3 opacity-0 shadow-[2px_3px_0_rgba(11,18,32,0.12)]",
                  )}
                >
                  <LandingNumberWatermark value={i + 1} />
                  <RankBadge
                    rank={rank}
                    size="md"
                    active={isActive}
                    surface="light"
                    showGlow={isActive && (rank.key === "mentrixer" || rank.key === "apex")}
                  />
                  <span
                    className="lp-body text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: rank.labelOnLight }}
                  >
                    {normalizeRankTitle(rank.title)}
                  </span>
                </LandingStickyNote>
              </motion.button>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-md">
          <div className="mb-4 text-center">
            <LandingEyebrow text={LANDING_E.rankGame.eyebrow} className="justify-center" />
            <h3 className={cn(landingHub.title, "mt-3 text-xl sm:text-2xl")}>{LANDING_E.rankGame.title}</h3>
            <p className={cn(landingHub.body, "mx-auto mt-2 max-w-md")}>{LANDING_E.rankGame.subtitle}</p>
          </div>
          <LandingStickyGameNote variant="pinned" className="rotate-[0.35deg]">
            <HeroRankStage />
          </LandingStickyGameNote>
        </div>
      </div>
    </section>
  );
}
