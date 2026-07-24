"use client";

import Link from "next/link";
import { useRef } from "react";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { LandingRoleIcon } from "@/features/marketing/landing/ui/landing-role-icon";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { cn } from "@/shared/core/utils";

/** Section E — dark final CTA with compete + Guide paths. */
export function LandingFinalCtaSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const root = sectionRef.current;
      if (!root) return;

      const targets = root.querySelectorAll(".lp-final-cta-reveal");
      gsap.set(targets, { y: 40, opacity: 0 });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        once: true,
        onEnter: () => {
          gsap.to(targets, {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.55,
            ease: "power3.out",
          });
        },
      });

      return () => trigger.kill();
    },
    [],
  );

  const { finalCta } = LANDING_E;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[var(--mx-navy-2)] py-14 md:py-16"
    >
      <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="lp-final-cta-reveal font-[family-name:var(--font-playfair),serif] text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight text-white opacity-0">
          <span className="block">{finalCta.line1}</span>
          <span className="mt-2 block">{finalCta.line2}</span>
        </h2>

        <div className="lp-final-cta-reveal mt-10 flex flex-col gap-3 opacity-0 sm:flex-row sm:justify-center">
          <Link
            href={finalCta.mentrixerHref}
            prefetch={false}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full",
              "bg-[var(--mx-violet)] px-6 py-3 text-[15px] font-bold text-white",
              "transition-colors hover:bg-[var(--mx-primary-hover)]",
            )}
          >
            <LandingRoleIcon role="mentrixer" size="md" surface="dark" />
            {finalCta.mentrixerCta}
          </Link>
          <Link
            href={finalCta.guideHref}
            prefetch={false}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full border",
              "border-white/20 px-6 py-3 text-[15px] font-semibold text-[var(--mx-muted)]",
              "transition-colors hover:border-white/40 hover:text-white",
            )}
          >
            <LandingRoleIcon role="guide" size="md" surface="dark" />
            {finalCta.guideCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
