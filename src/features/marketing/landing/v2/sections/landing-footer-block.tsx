"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { ContactSocialLinks } from "@/features/marketing/contact-ui/contact-social-links";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/features/marketing/mentrixa-brand";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { MentrixaGoalStickyNote } from "@/features/marketing/ui/mentrixa-goal-sticky-note";

const ICON_VERSION = "20260410";

function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <span className={`relative inline-block size-4 shrink-0 ${className}`} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
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

const ArrowRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const FEEDBACK_EMAIL = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

export function LandingFooterBlock() {
  const ctaRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.4 });
  const contactInView = useInView(contactRef, { once: true, amount: 0.35 });

  return (
    <>
      <section ref={ctaRef} className={`${landingHub.sectionTight} px-4 sm:px-5`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={ctaInView ? "visible" : "hidden"}
          className="relative z-10 mx-auto max-w-2xl"
        >
          <motion.div variants={fadeUp} custom={0}>
            <MentrixaGoalStickyNote variant="landing" density="full" className="text-center" rotate={false} />
          </motion.div>
          <motion.div
            variants={fadeUp}
            custom={1}
            className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <LandingShimmerButton href="/auth/signup" variant="primary" className="sm:min-w-[220px]">
              <RoleIcon role="mentrixer" />
              Prove what you know. Start free
              <ArrowRight />
            </LandingShimmerButton>
            <LandingShimmerButton href="/auth/signup?role=tutor" variant="secondary" className="sm:min-w-[200px]">
              <RoleIcon role="guide" />
              Earn from what you know →
            </LandingShimmerButton>
          </motion.div>
        </motion.div>
      </section>

      <section ref={contactRef} id="contact" className={`${landingHub.sectionTight} border-t border-[#C4B5FD]/60 px-4 sm:px-5`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={contactInView ? "visible" : "hidden"}
          className="relative z-10 mx-auto max-w-3xl"
        >
          <LandingStickyCard rotate className="rotate-[-0.35deg] px-5 py-8 text-center sm:px-7">
            <motion.p variants={fadeUp} custom={0} className={`mb-3 ${landingHub.eyebrow}`}>
              Contact and feedback
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className={landingHub.title}>
              Bug? Broken rank? Tell us.
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className={`mx-auto mt-4 max-w-xl ${landingHub.body}`}>
              We read everything. We reply to everything.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 flex justify-center">
              <ContactSocialLinks variant="default" />
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="mt-10">
              <LandingShimmerButton href="/contact" variant="primary">
                Send it directly →
                <ArrowRight />
              </LandingShimmerButton>
            </motion.div>
          </LandingStickyCard>
        </motion.div>
      </section>

      <footer className={`${landingHub.sectionTight} border-t border-[#C4B5FD]/60 px-4 sm:px-5`}>
        <LandingStickyCard rotate={false} className="mx-auto max-w-6xl rotate-[0.2deg] py-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <MentrixaLogoMark size="sm" />
                <span className={`text-[15px] font-bold tracking-tight ${landingHub.title}`}>Mentrixa</span>
              </Link>
              <p className={`mt-2 max-w-xs text-[12px] leading-snug ${landingHub.bodySm}`}>
                Built for AP Calculus AB students who want to know before it counts.
              </p>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center md:gap-10">
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <Link href="/privacy" className={`${landingHub.body} transition-colors hover:text-[#0B1220]`}>
                  Privacy
                </Link>
                <Link href="/terms" className={`${landingHub.body} transition-colors hover:text-[#0B1220]`}>
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="border-b border-[#6366F1] pb-0.5 font-semibold text-[#4F46E5] transition-colors hover:text-[#0B1220]"
                >
                  Contact
                </Link>
              </nav>
              <ContactSocialLinks variant="default" />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-[#C4B5FD]/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={`order-2 text-[11px] sm:order-1 ${landingHub.inkMuted}`}>
              &copy; {new Date().getFullYear()} Mentrixa Inc.
            </p>
            <span className={`order-1 text-[12px] sm:order-2 sm:text-right ${landingHub.inkMuted}`}>
              <a
                href={gmailWebComposeUrl(FEEDBACK_EMAIL)}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose in Gmail (web)"
                className="underline underline-offset-2 hover:text-[#0B1220]"
              >
                {FEEDBACK_EMAIL}
              </a>
            </span>
          </div>
        </LandingStickyCard>
      </footer>
    </>
  );
}
