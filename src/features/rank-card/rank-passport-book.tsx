"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

export function RankPassportStoryShell({
  children,
  className,
  pageCount,
}: {
  children: ReactNode;
  className?: string;
  pageCount: number;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;

    const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-passport-page]"));
    if (pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = pages.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActivePage(index);
        }
      },
      { root, threshold: 0.55 },
    );

    for (const page of pages) observer.observe(page);
    return () => observer.disconnect();
  }, [pageCount]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={shellRef}
        className="rank-passport-story snap-y snap-proximity overflow-y-auto overscroll-y-contain scroll-smooth"
        style={{ maxHeight: "min(78dvh, 720px)" }}
      >
        {children}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
        aria-hidden
      >
        {Array.from({ length: pageCount }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === activePage ? "w-5 bg-[var(--mx-violet)]" : "w-1.5 bg-[#C4B5FD]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function RankPassportStoryPage({
  children,
  pageIndex,
  hint,
  className,
}: {
  children: ReactNode;
  pageIndex: number;
  hint?: string;
  className?: string;
}) {
  const { mounted, prefersReducedMotion } = useHydrationSafeMotion();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      data-passport-page={pageIndex}
      className={cn(
        "rank-passport-page min-h-[min(68dvh,560px)] snap-start snap-always border-t border-violet-300/80 first:border-t-0",
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: pageIndex * 0.04 }}
    >
      {children}
      {hint ? (
        <motion.p
          className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]"
          initial={false}
          animate={mounted && !prefersReducedMotion ? { opacity: [0.45, 1, 0.45] } : { opacity: 0.7 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <MentrixaVocabIcon name="trajectory-certificate" size={14} surface="light" title="" />
          {hint}
        </motion.p>
      ) : null}
    </motion.section>
  );
}

export function RankPassportCover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const coverRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapEffect(
    (gsap) => {
      if (reduceMotion || !coverRef.current) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(coverRef.current, { scale: 0.94, opacity: 0, duration: 0.65 })
        .from(
          coverRef.current.querySelectorAll(".rank-passport-cover-line"),
          { y: 12, opacity: 0, stagger: 0.08, duration: 0.4 },
          "-=0.25",
        );

      return () => {
        tl.kill();
      };
    },
    [reduceMotion],
  );

  return (
    <div
      ref={coverRef}
      className={cn(
        "rank-passport-cover relative overflow-hidden rounded-lg border border-[#312E81] bg-[var(--mx-navy)] px-5 py-6 text-[var(--mx-rule)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),4px_12px_28px_-12px_rgba(2,6,23,0.65)] sm:px-7 sm:py-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent, transparent 18px, rgba(99,102,241,0.35) 18px, rgba(99,102,241,0.35) 19px)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
