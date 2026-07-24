"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { LandingRoleIcon } from "@/features/marketing/landing/ui/landing-role-icon";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

/** GSAP — CTAs rise in after feed (delay 1.2s). */
export function LandingHeroCtaSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reducedMotion) {
      if (el) el.style.opacity = "1";
      return;
    }

    let cancelled = false;

    void import("@/shared/core/gsap").then(({ gsap }) => {
      if (cancelled) return;
      gsap.from(".cta-section", {
        y: 40,
        opacity: 0,
        duration: 0.5,
        delay: 1.2,
        ease: "power3.out",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  return (
    <div ref={sectionRef} className="cta-section mt-6 space-y-3">
      <Link
        href={LANDING_E.ctaPrimaryHref}
        prefetch={false}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full",
          "bg-[var(--mx-violet)] px-5 py-3 text-[15px] font-bold text-white",
          "transition-colors hover:bg-[var(--mx-primary-hover)]",
        )}
      >
        <LandingRoleIcon role="mentrixer" size="md" surface="dark" />
        {LANDING_E.ctaPrimary}
      </Link>
      <Link
        href={LANDING_E.ctaSecondaryHref}
        prefetch={false}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-5 py-3",
          "text-[15px] font-semibold text-[var(--mx-muted)] transition-colors hover:text-white",
        )}
      >
        <LandingRoleIcon role="guide" size="md" surface="dark" />
        {LANDING_E.ctaSecondary}
      </Link>
    </div>
  );
}
