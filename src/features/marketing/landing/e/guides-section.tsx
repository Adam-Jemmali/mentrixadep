"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";
import {
  LandingSectionHeader,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { cn } from "@/shared/core/utils";

const ICON_VERSION = "20260718";

/** Section D — Guide mirror with sticky notes + dedicated CTA. */
export function LandingGuidesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGsapScrollTriggerEffect(
    (gsap, ScrollTrigger) => {
      const root = sectionRef.current;
      if (!root) return;

      const cards = root.querySelectorAll(".lp-guide-card");
      gsap.set(cards, { x: -20, opacity: 0 });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(cards, {
            x: 0,
            opacity: 1,
            stagger: 0.14,
            duration: 0.55,
            ease: "power3.out",
          });
        },
      });

      return () => trigger.kill();
    },
    [],
  );

  const { guides } = LANDING_E;

  return (
    <section id="guides" ref={sectionRef} className={landingHub.section}>
      <div className={cn(landingHub.sectionInner, "max-w-5xl")}>
        <LandingSectionHeader
          eyebrow={guides.eyebrow}
          title={guides.title}
          subtitle={guides.subtitle}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {guides.items.map((item, index) => (
            <LandingStickyCard
              key={item.word}
              variant={landingStickyVariantForIndex(index + 3)}
              className={cn("lp-guide-card h-full opacity-0", index % 2 === 1 && "rotate-[0.5deg]")}
            >
              <p className={landingHub.stickyWord}>{item.word}</p>
              <p className={cn(landingHub.body, "mt-2")}>{item.sentence}</p>
            </LandingStickyCard>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href={guides.ctaHref}
            prefetch={false}
            className={cn(
              landingHub.btnSecondary,
              "cursor-pointer rounded-full px-6",
            )}
          >
            <span className="relative inline-block size-5 shrink-0" aria-hidden>
              <Image
                src={`/icons/guide.svg?v=${ICON_VERSION}`}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="size-full object-contain"
                sizes="20px"
              />
            </span>
            {guides.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
