"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MasteryNode } from "@/components/mastery-node";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import {
  accountLevelFromRankTitle,
  type GuideWrappedData,
  type StudentWrappedData,
  type WrappedReportData,
  WRAPPED_SLIDE_COUNT,
} from "@/features/wrapped/wrapped-pure";
import { animate } from "@/shared/animation/anime";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/animation/motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

const ACCENT = "var(--mx-violet)";

type Props = {
  reportYear: number;
  displayName: string;
  data: WrappedReportData;
  shareUrl: string;
  rankUsername: string | null;
  initialSlide?: number;
};

function WrappedEyebrow({
  icon,
  children,
}: {
  icon:
    | "passport"
    | "focus-ring"
    | "breakthrough"
    | "rank-proof"
    | "verified"
    | "session"
    | "impact-score";
  children: ReactNode;
}) {
  return (
    <p className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.22em] text-[#64748B]">
      <MentrixaVocabIcon name={icon} size={16} surface="dark" title="" />
      {children}
    </p>
  );
}

function SlideDots({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (next: number) => void;
}) {
  return (
      <div className="pointer-events-auto flex items-center justify-center gap-2.5">
      {Array.from({ length: WRAPPED_SLIDE_COUNT }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Slide ${i + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(i);
          }}
          className={cn(
            "h-2 w-2 rounded-full transition-colors duration-200",
            i === index ? "bg-white" : "bg-[#64748B]/40",
          )}
        />
      ))}
    </div>
  );
}

function SlideOpener({
  reportYear,
  displayName,
  active,
}: {
  reportYear: number;
  displayName: string;
  active: boolean;
}) {
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || !wordmarkRef.current || reducedMotion) return;
    animate(wordmarkRef.current, {
      scale: [0, 1],
      opacity: [0, 1],
      duration: 700,
      ease: "outElastic(1, .62)",
    });
  }, [active, reducedMotion]);

  return (
    <div className="flex flex-col items-center text-center">
      <WrappedEyebrow icon="passport">This year on Mentrixa. {reportYear}</WrappedEyebrow>
      <p
        ref={wordmarkRef}
        className="mt-8 font-[family-name:var(--font-playfair),serif] text-[48px] font-bold leading-none"
        style={{ color: ACCENT }}
      >
        MENTRIXA
      </p>
      <p className="mt-6 text-xl font-semibold text-white">{displayName}</p>
    </div>
  );
}

function SlideHardest({
  data,
  active,
}: {
  data: StudentWrappedData;
  active: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const hardest = data.hardest_node;

  useEffect(() => {
    if (!active || !nodeRef.current || reducedMotion) return;
    animate(nodeRef.current, {
      translateX: [-8, 8, -5, 5, -2, 2, 0],
      duration: 520,
      ease: "easeInOut",
    });
  }, [active, reducedMotion]);

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <WrappedEyebrow icon="focus-ring">Your hardest moment</WrappedEyebrow>
      {hardest ? (
        <>
          <p className="mt-6 font-[family-name:var(--font-playfair),serif] text-[32px] font-bold leading-tight text-white">
            {hardest.nodeName}
          </p>
          <p className="mt-3 text-base text-[#94A3B8]">
            {hardest.attempts} attempts before it clicked
          </p>
          <div
            ref={nodeRef}
            className="mt-8 rounded-[var(--radius-node)] shadow-[0_0_28px_rgba(245,158,11,0.45)]"
          >
            <MasteryNode
              nodeId="wrapped-hardest"
              state="attempted"
              nodeName={hardest.nodeName}
              size="lg"
              showLabel
            />
          </div>
        </>
      ) : (
        <LandingStickyNote variant="clip" className="mt-8 rotate-0 px-4 py-4 text-left">
          <p className="text-sm font-bold text-[var(--mx-navy)]">You kept showing up.</p>
          <p className="mt-2 text-sm text-[#475569]">Every node you cracked counted.</p>
        </LandingStickyNote>
      )}
    </div>
  );
}

function SlideBreakthrough({
  data,
  reportYear,
  rankUsername,
  active,
}: {
  data: StudentWrappedData;
  reportYear: number;
  rankUsername: string | null;
  active: boolean;
}) {
  const breakthrough = data.breakthrough_node;

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      <WrappedEyebrow icon="breakthrough">Your biggest breakthrough</WrappedEyebrow>
      {breakthrough ? (
        <div className="mt-6 w-full">
          <BeforeAfterCard
            key={active ? `breakthrough-${reportYear}-on` : `breakthrough-${reportYear}-off`}
            nodeName={breakthrough.nodeName}
            beforeAccuracy={breakthrough.beforePct}
            afterAccuracy={breakthrough.afterPct}
            date={
              breakthrough.dateLabel
                ? new Date(breakthrough.dateLabel)
                : new Date(Date.UTC(reportYear, 5, 15))
            }
            mode="inline"
            rankUsername={rankUsername}
          />
        </div>
      ) : (
        <LandingStickyNote variant="pinned" className="mt-8 w-full rotate-0 px-4 py-4 text-center">
          <p className="text-sm font-bold text-[var(--mx-navy)]">A real jump this year.</p>
          <p className="mt-2 text-sm text-[#475569]">Verified first attempts only.</p>
        </LandingStickyNote>
      )}
    </div>
  );
}

function SlideRankJourney({
  data,
  active,
}: {
  data: StudentWrappedData;
  active: boolean;
}) {
  const start = accountLevelFromRankTitle(data.rank_start);
  const end = accountLevelFromRankTitle(data.rank_end);
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center">
      <WrappedEyebrow icon="rank-proof">Where you started vs where you are</WrappedEyebrow>
      <div className="mt-8 flex w-full items-center justify-center gap-4 sm:gap-6">
        <motion.div
          initial={false}
          animate={
            active
              ? { opacity: 1, y: 0 }
              : reducedMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 8 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center gap-2"
        >
          <RankBadge
            rank={{ level: start.level, title: start.title }}
            size="lg"
            surface="onDark"
            labelTone="dark"
            showLabel
            locked
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
            Start
          </span>
        </motion.div>

        <div className="relative flex h-10 w-16 items-center justify-center sm:w-20">
          <motion.span
            className="absolute inset-y-1/2 h-0.5 w-full origin-left rounded-full bg-[var(--mx-violet)]"
            initial={false}
            animate={active ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0.4 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: reducedMotion ? 0 : 0.25 }}
          />
          <MentrixaVocabIcon
            name="rank-proof"
            size={22}
            className="relative text-[var(--mx-violet)]"
            title="Rank journey"
          />
        </div>

        <motion.div
          initial={false}
          animate={
            active
              ? { opacity: 1, scale: 1 }
              : reducedMotion
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.82 }
          }
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 22,
            delay: reducedMotion ? 0 : 0.45,
          }}
          className="flex flex-col items-center gap-2"
        >
          <RankBadge
            rank={{ level: end.level, title: end.title }}
            size="lg"
            surface="onDark"
            labelTone="dark"
            showLabel
            active
            animate={end.level >= 6}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
            Now
          </span>
        </motion.div>
      </div>
      <p className="mt-8 inline-flex items-center gap-2 text-sm font-bold" style={{ color: ACCENT }}>
        <MentrixaVocabIcon name="verified" size={18} gold surface="dark" title="Verified" />
        {data.total_nodes_verified} skills proven. No retakes.
      </p>
    </div>
  );
}

function SlideClose({
  reportYear,
  onShare,
  sharing,
}: {
  reportYear: number;
  onShare: () => void;
  sharing: boolean;
}) {
  const nextYear = reportYear + 1;

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <WrappedEyebrow icon="passport">See you in {nextYear}</WrappedEyebrow>
      <p className="mt-8 font-[family-name:var(--font-playfair),serif] text-[28px] font-bold leading-snug text-white">
        Your rank is waiting.
      </p>
      <div className="mt-10 flex w-full flex-col gap-3">
        <Link
          href="/student"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mx-violet)] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-[var(--mx-primary-hover)]"
        >
          <MentrixaVocabIcon name="quest" size={18} surface="dark" title="Home" />
          Start where you left off →
        </Link>
        <button
          type="button"
          disabled={sharing}
          onClick={(event) => {
            event.stopPropagation();
            onShare();
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#334155] bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#CBD5E1] transition-colors hover:border-[var(--mx-violet)]/50 hover:text-white disabled:opacity-60"
        >
          <MentrixaVocabIcon name="rank-proof" size={18} surface="dark" title="Share" />
          {sharing ? "Opening share…" : `Share your ${reportYear} →`}
        </button>
      </div>
    </div>
  );
}

function SlideGuideFallback({
  slide,
  data,
  reportYear,
}: {
  slide: number;
  data: GuideWrappedData;
  reportYear: number;
}) {
  if (slide === 1) return null;
  const lines = [
    {
      icon: "session" as const,
      title: `${data.students_helped} Mentrixers helped`,
      body: "First attempt movement only.",
    },
    {
      icon: "breakthrough" as const,
      title: data.highest_impact_node
        ? `${data.highest_impact_node.nodeName}. +${data.highest_impact_node.avgDelta}`
        : `${data.total_breakthroughs} breakthroughs`,
      body: "Guide impact locked in.",
    },
    {
      icon: "impact-score" as const,
      title: `$${Math.round(data.total_earnings_cents / 100)} earned`,
      body: "Measured by lift, not likes.",
    },
  ];
  const line = lines[slide - 2];
  if (!line) return null;

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <WrappedEyebrow icon={line.icon}>Guide Wrapped {reportYear}</WrappedEyebrow>
      <LandingStickyNote variant="dog-ear" className="mt-8 w-full rotate-0 px-5 py-5 text-left">
        <p className="text-lg font-bold text-[var(--mx-navy)]">{line.title}</p>
        <p className="mt-2 text-sm text-[#475569]">{line.body}</p>
      </LandingStickyNote>
    </div>
  );
}

export function WrappedSlidesExperience({
  reportYear,
  displayName,
  data,
  shareUrl,
  rankUsername,
  initialSlide = 1,
}: Props) {
  const start = Math.min(
    WRAPPED_SLIDE_COUNT,
    Math.max(1, Number.isFinite(initialSlide) ? Math.round(initialSlide) : 1),
  );
  const [index, setIndex] = useState(start - 1);
  const [sharing, setSharing] = useState(false);
  const reducedMotion = useReducedMotion();

  const go = useCallback((next: number) => {
    setIndex(((next % WRAPPED_SLIDE_COUNT) + WRAPPED_SLIDE_COUNT) % WRAPPED_SLIDE_COUNT);
  }, []);

  const advance = useCallback(() => {
    if (index >= WRAPPED_SLIDE_COUNT - 1) return;
    go(index + 1);
  }, [go, index]);

  const retreat = useCallback(() => {
    if (index <= 0) return;
    go(index - 1);
  }, [go, index]);

  const shareSlide = useCallback(async () => {
    const slide = index + 1;
    const url = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}slide=${slide}`;
    setSharing(true);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `Mentrixa Wrapped ${reportYear}`,
          text: `Slide ${slide} of ${WRAPPED_SLIDE_COUNT}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* dismissed */
    } finally {
      setSharing(false);
    }
  }, [index, reportYear, shareUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        advance();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        retreat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, retreat]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const isStudent = data.kind === "student";

  const slideContent = (() => {
    if (isStudent) {
      switch (index) {
        case 0:
          return (
            <SlideOpener
              reportYear={reportYear}
              displayName={displayName}
              active={index === 0}
            />
          );
        case 1:
          return <SlideHardest data={data} active={index === 1} />;
        case 2:
          return (
            <SlideBreakthrough
              data={data}
              reportYear={reportYear}
              rankUsername={rankUsername}
              active={index === 2}
            />
          );
        case 3:
          return <SlideRankJourney data={data} active={index === 3} />;
        case 4:
          return (
            <SlideClose reportYear={reportYear} onShare={shareSlide} sharing={sharing} />
          );
        default:
          return null;
      }
    }

    switch (index) {
      case 0:
        return (
          <SlideOpener
            reportYear={reportYear}
            displayName={displayName}
            active={index === 0}
          />
        );
      case 4:
        return (
          <SlideClose reportYear={reportYear} onShare={shareSlide} sharing={sharing} />
        );
      default:
        return <SlideGuideFallback slide={index + 1} data={data} reportYear={reportYear} />;
    }
  })();

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[var(--mx-navy)] text-white"
      data-lenis-prevent
      onClick={() => {
        if (index < WRAPPED_SLIDE_COUNT - 1) advance();
      }}
      role="presentation"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(event) => {
              event.stopPropagation();
              retreat();
            }}
            disabled={index === 0}
            className="pointer-events-auto rounded-full border border-white/10 bg-white/5 p-2 text-white/80 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Share this slide"
            onClick={(event) => {
              event.stopPropagation();
              void shareSlide();
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#CBD5E1]"
          >
            <MentrixaVocabIcon name="rank-proof" size={14} surface="dark" title="Share" />
            Share slide
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={(event) => {
              event.stopPropagation();
              advance();
            }}
            disabled={index >= WRAPPED_SLIDE_COUNT - 1}
            className="pointer-events-auto rounded-full border border-white/10 bg-white/5 p-2 text-white/80 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-28 pt-6 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={
                reducedMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 1.05 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                reducedMotion
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: 0,
                      scale: 0.95,
                      transition: { duration: 0.2, ease: "easeIn" },
                    }
              }
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-none w-full max-w-2xl"
            >
              <div className="pointer-events-auto">{slideContent}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <SlideDots index={index} onSelect={go} />
      </div>
    </div>
  );
}
