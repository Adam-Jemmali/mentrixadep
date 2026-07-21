"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import {
  formatProofAccuracy,
  formatProofDate,
  formatProofRankFootprint,
  PROOF_CARD_COPY,
} from "@/features/share/before-after-card-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { useReducedMotion } from "@/shared/animation/motion";
import { KokonutGlass } from "@/shared/ui/kokonut-glass";
import { cn } from "@/shared/core/utils";

const PARTICLE_COUNT = 10;

export type BeforeAfterCardProps = {
  nodeName: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  guideName?: string;
  date: Date;
  mode: "inline" | "share" | "portfolio";
  rankUsername?: string | null;
  shareUrl?: string;
  className?: string;
};

function ProofCardShell({
  mode,
  className,
  children,
}: {
  mode: BeforeAfterCardProps["mode"];
  className?: string;
  children: ReactNode;
}) {
  if (mode === "portfolio") {
    return (
      <LandingStickyNote variant="strip" compact className={cn("overflow-hidden p-0", className)}>
        {children}
      </LandingStickyNote>
    );
  }

  return (
    <LandingStickyNote variant="pinned" className={cn("overflow-hidden p-0", className)}>
      {children}
    </LandingStickyNote>
  );
}

export function BeforeAfterCard({
  nodeName,
  beforeAccuracy,
  afterAccuracy,
  guideName,
  date,
  mode,
  rankUsername,
  shareUrl,
  className,
}: BeforeAfterCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const afterPanelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const animate = mode !== "portfolio" && !reducedMotion;
  const compact = mode === "portfolio";

  const [beforeDisplay, setBeforeDisplay] = useState(
    animate ? "0%" : formatProofAccuracy(beforeAccuracy),
  );
  const [afterDisplay, setAfterDisplay] = useState(
    animate ? "0%" : formatProofAccuracy(afterAccuracy),
  );
  const [nodeVisible, setNodeVisible] = useState(!animate);
  const [sharing, setSharing] = useState(false);

  const rankFootprint = formatProofRankFootprint(rankUsername);
  const skill = nodeName.trim() || "this skill";

  const runParticleBurst = useCallback(() => {
    const panel = afterPanelRef.current;
    if (!panel || reducedMotion || mode === "portfolio") return;

    const particles = panel.querySelectorAll<HTMLElement>(".proof-particle");
    if (!particles.length) return;

    void import("@/shared/animation/anime").then(({ animate, stagger, utils }) => {
      particles.forEach((el) => {
        el.style.opacity = "1";
      });
      animate(particles, {
        translateX: () => utils.random(-30, 30),
        translateY: () => utils.random(-25, -5),
        opacity: [1, 0],
        duration: 600,
        ease: "outQuart",
        delay: stagger(40),
      });
    });
  }, [mode, reducedMotion]);

  useEffect(() => {
    if (!animate) {
      setBeforeDisplay(formatProofAccuracy(beforeAccuracy));
      setAfterDisplay(formatProofAccuracy(afterAccuracy));
      setNodeVisible(true);
      return;
    }

    let cancelled = false;
    let timeline: { kill: () => void } | null = null;

    void import("@/shared/core/gsap").then(({ gsap }) => {
      if (cancelled || !rootRef.current) return;

      const divider = rootRef.current.querySelector<HTMLElement>(".card-divider");
      const nodeEl = rootRef.current.querySelector<HTMLElement>(".node-name");

      if (divider) gsap.set(divider, { scaleY: 0, transformOrigin: "center center" });
      if (nodeEl) gsap.set(nodeEl, { opacity: 0, y: 6 });

      const beforeObj = { val: 0 };
      const afterObj = { val: 0 };

      timeline = gsap.timeline({ delay: 0.2 });

      timeline.to(beforeObj, {
        val: beforeAccuracy,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => setBeforeDisplay(formatProofAccuracy(beforeObj.val)),
      });

      if (divider) {
        timeline.to(
          divider,
          { scaleY: 1, duration: 0.3, ease: "power2.out" },
          0.5,
        );
      }

      timeline.to(
        afterObj,
        {
          val: afterAccuracy,
          duration: 0.9,
          ease: "power3.out",
          onUpdate: () => setAfterDisplay(formatProofAccuracy(afterObj.val)),
          onComplete: runParticleBurst,
        },
        0.6,
      );

      if (nodeEl) {
        timeline.to(
          nodeEl,
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
          1.0,
        );
      }

      timeline.call(() => setNodeVisible(true));
    });

    return () => {
      cancelled = true;
      timeline?.kill();
    };
  }, [
    animate,
    afterAccuracy,
    beforeAccuracy,
    runParticleBurst,
  ]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    setSharing(true);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `${skill} proof on Mentrixa`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      /* user dismissed or clipboard blocked */
    } finally {
      setSharing(false);
    }
  }, [shareUrl, skill]);

  return (
    <div className={cn("w-full", className)}>
      <ProofCardShell mode={mode}>
        <KokonutGlass
          verifiedGlow
          className={cn(
            "rounded-xl border border-[rgba(212,160,23,0.25)] bg-[var(--mx-navy-2,#0F172A)]",
            compact ? "p-3" : "p-4 sm:p-5",
          )}
        >
          <div ref={rootRef} className="relative">
            <div className="flex items-center gap-1.5">
              <MentrixaVocabIcon name="verified" size={14} gold surface="dark" title="Proof" />
              <span className="text-[11px] font-bold tracking-[0.14em] text-[var(--mx-violet,#7C3AED)]">
                {PROOF_CARD_COPY.wordmark}
              </span>
            </div>

            <div
              className={cn(
                "mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3",
                compact && "mt-3 gap-2",
              )}
            >
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mx-muted,#9CA3AF)]">
                  {PROOF_CARD_COPY.beforeLabel}
                </p>
                <p
                  className={cn(
                    "before-number mt-1 font-[family-name:var(--font-playfair),serif] font-bold tabular-nums text-red-500/30",
                    compact ? "text-[32px]" : "text-[48px]",
                  )}
                >
                  {beforeDisplay}
                </p>
              </div>

              <div
                className="card-divider h-14 w-px bg-[var(--mx-gold,#D4A017)]/60"
                aria-hidden
              />

              <div ref={afterPanelRef} className="relative text-center">
                {animate
                  ? Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
                      <span
                        key={index}
                        className={cn(
                          "proof-particle pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mx-gold,#D4A017)] opacity-0",
                          `particle-${index}`,
                        )}
                        aria-hidden
                      />
                    ))
                  : null}
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mx-muted,#9CA3AF)]">
                  {PROOF_CARD_COPY.afterLabel}
                </p>
                <p
                  className={cn(
                    "after-number mt-1 font-[family-name:var(--font-playfair),serif] font-bold tabular-nums text-emerald-400",
                    compact ? "text-[32px]" : "text-[48px]",
                  )}
                >
                  {afterDisplay}
                </p>
              </div>
            </div>

            <p
              className={cn(
                "node-name mt-4 text-center font-sans text-white",
                compact ? "mt-3 text-sm" : "text-base",
                !nodeVisible && animate && "opacity-0",
              )}
            >
              {skill}
            </p>

            {guideName?.trim() ? (
              <p className="mt-1 text-center text-[13px] text-[var(--mx-muted,#9CA3AF)]">
                {PROOF_CARD_COPY.withGuide(guideName)}
              </p>
            ) : null}

            <p className="mt-1 text-center text-xs text-[var(--mx-muted,#9CA3AF)]">
              {formatProofDate(date)}
            </p>

            {rankFootprint && mode !== "portfolio" ? (
              <p className="mt-3 text-center text-[11px] font-semibold text-[var(--mx-violet,#7C3AED)]">
                {rankUsername ? (
                  <Link href={`/rank/${rankUsername}`} className="hover:text-[var(--mx-indigo,#6366F1)]">
                    {rankFootprint}
                  </Link>
                ) : (
                  rankFootprint
                )}
              </p>
            ) : null}
          </div>
        </KokonutGlass>
      </ProofCardShell>

      {mode === "share" && shareUrl ? (
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={sharing}
          className={cn(
            "mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full",
            "bg-[var(--mx-violet,#7C3AED)] px-5 py-2.5 text-sm font-bold text-white",
            "transition-colors hover:bg-[#6D28D9] disabled:opacity-70",
          )}
        >
          <MentrixaVocabIcon name="rank-proof" size={16} surface="dark" title="Share" />
          {sharing ? "Shared" : PROOF_CARD_COPY.shareCta}
        </button>
      ) : null}
    </div>
  );
}
