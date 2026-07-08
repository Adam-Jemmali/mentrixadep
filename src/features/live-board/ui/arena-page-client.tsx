"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import { LiveBoardFeed } from "@/features/live-board/ui/live-board-feed";
import { ArenaLeadersPanel } from "@/features/live-board/ui/arena-leaders-panel";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";

type Props = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
};

export function ArenaPageClient({ initialEvents, leaders }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(ARENA_PAGE_COPY.ctaHref);
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 pb-16 pt-20 sm:px-6 lg:pt-24">
      <motion.header
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <motion.h1
          variants={fadeUp}
          custom={0}
          className="lp-hand-title text-pretty text-[clamp(1.75rem,4.5vw,2.65rem)] font-bold italic leading-[1.08] tracking-[-0.02em] text-white"
        >
          {ARENA_PAGE_COPY.title}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          custom={1}
          className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base"
        >
          {ARENA_PAGE_COPY.subtitle}
        </motion.p>
        <motion.div variants={fadeUp} custom={2} className="mt-7 flex justify-center">
          <LandingShimmerButton href={ARENA_PAGE_COPY.ctaHref} variant="primary">
            {ARENA_PAGE_COPY.cta}
          </LandingShimmerButton>
        </motion.div>
      </motion.header>

      <LiveBoardFeed initialEvents={initialEvents} leaders={leaders} />
      <ArenaLeadersPanel leaders={leaders} />
    </div>
  );
}
