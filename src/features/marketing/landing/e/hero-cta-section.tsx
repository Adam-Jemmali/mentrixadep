"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const ICON_VERSION = "20260718";

function RoleIcon({ role }: { role: "mentrixer" | "guide" }) {
  return (
    <span className="relative inline-block size-4 shrink-0" aria-hidden>
      <Image
        src={
          role === "mentrixer"
            ? `/icons/mentrixer.svg?v=${ICON_VERSION}`
            : `/icons/guide.svg?v=${ICON_VERSION}`
        }
        alt=""
        width={16}
        height={16}
        unoptimized
        className="size-full object-contain"
        sizes="16px"
      />
    </span>
  );
}

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
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 1.2,
        ease: "power2.out",
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
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full",
          "bg-[var(--mx-violet,#7C3AED)] px-5 py-3 text-[15px] font-bold text-white",
          "transition-colors hover:bg-[#6D28D9]",
        )}
      >
        <RoleIcon role="mentrixer" />
        {LANDING_E.ctaPrimary}
      </Link>
      <Link
        href={LANDING_E.ctaSecondaryHref}
        prefetch={false}
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3",
          "text-[15px] font-semibold text-[var(--mx-muted,#9CA3AF)] transition-colors hover:text-white",
        )}
      >
        <RoleIcon role="guide" />
        {LANDING_E.ctaSecondary}
      </Link>
    </div>
  );
}
