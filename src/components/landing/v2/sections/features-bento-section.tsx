"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IMAGE_QUALITY } from "@/lib/image-defaults";
import { ArenaMeshBackground } from "@/components/landing/v2/backgrounds/arena-mesh-background";
import {
  fadeUp,
  staggerContainer,
  viewportOnce,
} from "@/components/landing/v2/motion/landing-motion";

type Feature = {
  title: string;
  image: string;
  icon: string;
  rotation: number;
  accent: string;
};

/** Two polaroids per row — compact timeline for the landing page. */
const FEATURE_ROWS: Feature[][] = [
  [
    {
      title: "Live Duels",
      image: "/images/features/live-duels.webp",
      icon: "/images/live.webp",
      rotation: -2,
      accent: "from-violet-500/50",
    },
    {
      title: "Duel Arena",
      image: "/images/features/duel-arena.webp",
      icon: "/images/sword.webp",
      rotation: 2,
      accent: "from-indigo-500/50",
    },
  ],
  [
    {
      title: "Problem Solver",
      image: "/images/features/problem-solver.webp",
      icon: "/images/quest.webp",
      rotation: 1,
      accent: "from-purple-500/50",
    },
    {
      title: "Learning Path",
      image: "/images/features/learning-path.webp",
      icon: "/images/book.webp",
      rotation: -1,
      accent: "from-blue-500/50",
    },
  ],
  [
    {
      title: "League",
      image: "/images/features/league.webp",
      icon: "/images/xp.webp",
      rotation: -2,
      accent: "from-violet-500/50",
    },
    {
      title: "Clan Wars",
      image: "/images/features/clan-wars.webp",
      icon: "/images/clan.webp",
      rotation: 2,
      accent: "from-indigo-500/50",
    },
  ],
  [
    {
      title: "Session Room",
      image: "/images/features/session-room.webp",
      icon: "/images/user.webp",
      rotation: 1,
      accent: "from-purple-500/50",
    },
    {
      title: "Study Package",
      image: "/images/features/study-package.webp",
      icon: "/images/package.webp",
      rotation: -1,
      accent: "from-blue-500/50",
    },
  ],
  [
    {
      title: "Studio Output",
      image: "/images/features/studio-output.webp",
      icon: "/images/pending.webp",
      rotation: -2,
      accent: "from-violet-500/50",
    },
    {
      title: "Guide Knowledge",
      image: "/images/features/guide-knowledge.webp",
      icon: "/images/money.webp",
      rotation: 2,
      accent: "from-indigo-500/50",
    },
  ],
];

function FeatureIconBadge({ icon }: { icon: string }) {
  return (
    <div
      className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-white/10 p-1.5 shadow-[0_0_20px_rgba(255,255,255,0.12)] backdrop-blur-sm sm:size-12"
      aria-hidden
    >
      <Image
        src={icon}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="size-full object-contain brightness-0 invert"
        sizes="36px"
        quality={IMAGE_QUALITY}
      />
    </div>
  );
}

function PolaroidPhoto({ feature }: { feature: Feature }) {
  return (
    <div className="relative">
      <div
        className="lp-polaroid relative overflow-hidden rounded-sm bg-white p-2 pb-9 shadow-xl shadow-black/35 sm:p-2 sm:pb-10"
        style={{ transform: `rotate(${feature.rotation}deg)` }}
      >
        <div className="relative h-[140px] w-[200px] overflow-hidden rounded-[2px] sm:h-[160px] sm:w-[240px]">
          <Image
            src={feature.image}
            alt={feature.title}
            fill
            loading="lazy"
            className="object-cover object-top"
            sizes="(max-width: 640px) 200px, 240px"
            quality={IMAGE_QUALITY}
          />
        </div>
        <p className="absolute inset-x-0 bottom-2 px-2 text-center text-[11px] font-semibold tracking-tight text-slate-700 sm:text-xs">
          {feature.title}
        </p>
        <div className="pointer-events-none absolute -right-2 -top-1.5 h-6 w-10 rotate-12 bg-amber-100/70 shadow-sm" />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-br to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100",
          feature.accent,
        )}
      />
    </div>
  );
}

function PolaroidCard({ feature, align }: { feature: Feature; align: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: feature.rotation * 0.4 }}
      whileInView={{ opacity: 1, y: 0, rotate: feature.rotation }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "lp-polaroid-card group flex flex-col items-center",
        align === "left" ? "sm:items-start sm:pr-4" : "sm:items-end sm:pl-4",
      )}
    >
      <div className="relative flex items-center gap-2.5 sm:gap-3">
        {align === "left" ? (
          <>
            <PolaroidPhoto feature={feature} />
            <FeatureIconBadge icon={feature.icon} />
          </>
        ) : (
          <>
            <FeatureIconBadge icon={feature.icon} />
            <PolaroidPhoto feature={feature} />
          </>
        )}
      </div>
    </motion.div>
  );
}

export function FeaturesBentoSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#0F172A] py-16 md:py-20"
    >
      <ArenaMeshBackground variant="section" showWatermark={false} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="mx-auto max-w-3xl text-center text-[clamp(22px,3.4vw,34px)] font-bold leading-tight tracking-[-0.03em] text-white"
          >
            Any skill you take seriously. 1 arena. No ceiling.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-300 md:text-[15px]"
          >
            The same competitive loop for university, certifications, and career skills.
          </motion.p>
        </motion.div>

        <div className="relative mt-10 space-y-8 sm:space-y-10">
          <div className="pointer-events-none absolute bottom-4 left-1/2 top-4 hidden w-px -translate-x-1/2 bg-gradient-to-b from-violet-500/40 via-indigo-400/25 to-transparent sm:block" />

          {FEATURE_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400/70 bg-slate-950 sm:block" />

              <PolaroidCard feature={row[0]!} align="left" />
              <PolaroidCard feature={row[1]!} align="right" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
