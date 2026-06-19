"use client";

import { useEffect, useRef, useState } from "react";
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
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import { fadeUp, staggerContainer, viewportOnce, springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { cn } from "@/shared/core/utils";

const RANK_MOTIVATION: Record<AccountRankKey, string> = {
  wanderer: "You showed up. Rank starts now.",
  seeker: "You came back. Most do not.",
  scholar: "You are in the game.",
  contender: "Your name is on the board.",
  rival: "The top sees you coming.",
  apex: "One rank from MENTRIXER.",
  mentrixer: "Proven in public. Earned.",
};

export function RankLadderShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const { cinematic, mounted, reduced } = useLandingMotion();
  const isInView = useInView(sectionRef, { amount: 0.35, once: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollDriving, setScrollDriving] = useState(false);
  const scrollPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const glowOpacity = useTransform(scrollYProgress, [0.15, 0.45, 0.85], [0.25, 1, 0.35]);
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

  const [coachMessage, setCoachMessage] = useState("Tap a rank or scroll. Are you as good as you think?");
  const active = ACCOUNT_RANK_VISUALS[activeIndex]!;

  useEffect(() => {
    setCoachMessage(
      `${normalizeRankTitle(active.title)} · ${active.minXp.toLocaleString()} to ${
        active.maxXp != null ? active.maxXp.toLocaleString() : "∞"
      } XP · ${RANK_MOTIVATION[active.key]}`,
    );
  }, [active.key, active.title, active.minXp, active.maxXp]);

  return (
    <section
      id="ranks"
      ref={sectionRef}
      className="relative overflow-hidden bg-arena-bg py-20 md:py-28"
    >
      <ArenaMeshBackground variant="section" />

      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/25 blur-[110px]"
        style={{
          opacity: !mounted || reduced || !cinematic ? 0.45 : glowOpacity,
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
            Prove what you know
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-3 max-w-2xl font-bold text-white text-[clamp(24px,3.8vw,40px)] tracking-[-0.03em] leading-tight"
          >
            Seven ranks. One question. Are you as good as you think?
          </motion.h2>
        </motion.div>

        <LandingSpeechBubble
          message={coachMessage}
          tone="coach"
          label="Where everyone starts"
          className="mx-auto mt-8"
        />

        <div className="mt-8 flex flex-col items-center gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              initial={{ opacity: 0, scale: 0.82, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, y: -16, filter: "blur(6px)" }}
              transition={springSoft}
              className="flex flex-col items-center gap-3 text-center"
            >
              <motion.div
                animate={
                  cinematic && (active.key === "mentrixer" || active.key === "apex")
                    ? {
                        boxShadow: [
                          `0 0 40px ${active.colorMuted}`,
                          `0 0 80px ${active.colorMuted}`,
                          `0 0 40px ${active.colorMuted}`,
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-3xl"
              >
                <RankBadge
                  rank={active}
                  size="xl"
                  active
                  surface="onDark"
                  showGlow={active.key === "mentrixer" || active.key === "apex"}
                  priority
                />
              </motion.div>
              <RankTitle rank={active} tone="dark" className="text-lg font-bold text-white" />
              <p className="text-xs font-medium tabular-nums text-slate-300">
                {active.minXp.toLocaleString()} XP
                {active.maxXp != null ? ` to ${active.maxXp.toLocaleString()} XP` : "+"}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="relative flex w-full gap-3 overflow-x-auto pb-2 snap-x snap-mandatory lg:justify-center lg:overflow-visible">
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
                    opacity: isActive ? 1 : 0.88,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className={cn(
                    "group relative flex shrink-0 snap-center cursor-pointer flex-col items-center gap-2 rounded-2xl border p-3",
                    isActive
                      ? "border-white/35 bg-slate-900/95"
                      : "border-white/20 bg-slate-900/75 hover:border-white/30 hover:bg-slate-900/90",
                  )}
                  style={
                    isActive
                      ? {
                          boxShadow: `0 0 36px -6px ${rank.colorMuted}`,
                          borderColor: `${rank.color}66`,
                        }
                      : undefined
                  }
                  aria-pressed={isActive}
                  aria-label={normalizeRankTitle(rank.title)}
                >
                  <RankBadge
                    rank={rank}
                    size="md"
                    active={isActive}
                    surface="onDark"
                    showGlow={isActive && (rank.key === "mentrixer" || rank.key === "apex")}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide",
                      !isActive && "opacity-85",
                    )}
                    style={{ color: rank.labelOnDark }}
                  >
                    {normalizeRankTitle(rank.title)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
