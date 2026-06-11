"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { ContactSocialLinks } from "@/features/marketing/contact-ui/contact-social-links";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/features/marketing/mentrixa-brand";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";

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
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const FEEDBACK_EMAIL = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

const FINAL_CTA_COPY = `You put in the hours.
You still do not know if it stuck.

Compete. See where you stand.
Fix the gap in one session.

Free to start. $39 for a breakthrough.
Accuracy improves or the session is free.`;

export function LandingFooterBlock() {
  const ctaRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.4 });
  const contactInView = useInView(contactRef, { once: true, amount: 0.35 });

  return (
    <>
      <section
        ref={ctaRef}
        className="lp-band-cta relative overflow-hidden py-14 md:py-20"
      >
        <ArenaMeshBackground variant="cta" showGrid={false} />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={ctaInView ? "visible" : "hidden"}
          className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-5"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="whitespace-pre-line text-balance font-bold text-white text-[clamp(20px,5.5vw,32px)] tracking-[-0.03em] leading-[1.35] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
          >
            {FINAL_CTA_COPY}
          </motion.h2>
          <motion.div
            variants={fadeUp}
            custom={1}
            className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <LandingShimmerButton href="/auth/signup" variant="primary" className="sm:min-w-[220px]">
              <RoleIcon role="mentrixer" />
              Prove what you know. Start free →
              <ArrowRight />
            </LandingShimmerButton>
            <LandingShimmerButton href="/auth/signup?role=tutor" variant="secondary" className="sm:min-w-[200px]">
              <RoleIcon role="guide" className="brightness-0 invert" />
              Earn from what you know →
            </LandingShimmerButton>
          </motion.div>
        </motion.div>
      </section>

      <section ref={contactRef} id="contact" className="lp-band-contact relative border-t border-white/[0.06] py-10 md:py-14">
        <ArenaMeshBackground variant="section" showGrid={false} showWatermark={false} />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={contactInView ? "visible" : "hidden"}
          className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-5"
        >
          <motion.p variants={fadeUp} custom={0} className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">
            Contact and feedback
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="font-bold text-white text-[clamp(22px,6vw,32px)] tracking-[-0.03em] leading-tight">
            Bug? Broken rank? Tell us.
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-200">
            We read everything. We reply to everything.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex justify-center">
            <ContactSocialLinks variant="dark" />
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="mt-10">
            <LandingShimmerButton href="/contact" variant="primary">
              Send it directly →
              <ArrowRight />
            </LandingShimmerButton>
          </motion.div>
        </motion.div>
      </section>

      <footer className="lp-footer-bg relative px-4 py-10 sm:px-5">
        <ArenaMeshBackground variant="section" showGrid={false} />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <MentrixaLogoMark size="sm" className="opacity-90" />
                <span className="text-[15px] font-bold tracking-tight text-white">Mentrixa</span>
              </Link>
              <p className="mt-2 max-w-xs text-[12px] leading-snug text-indigo-200/75">
                Built for people who want to know before it counts.
              </p>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center md:gap-10">
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <Link href="/privacy" className="text-indigo-100/85 transition-colors hover:text-white">
                  Privacy
                </Link>
                <Link href="/terms" className="text-indigo-100/85 transition-colors hover:text-white">
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="border-b border-indigo-400/50 pb-0.5 font-semibold text-white transition-colors hover:border-indigo-300"
                >
                  Contact
                </Link>
              </nav>
              <ContactSocialLinks variant="footer" />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="order-2 text-[11px] text-slate-300 sm:order-1">
              &copy; {new Date().getFullYear()} Mentrixa Inc. · Built in Ottawa.
            </p>
            <span className="order-1 text-[12px] text-indigo-300/70 sm:order-2 sm:text-right">
              <a
                href={gmailWebComposeUrl(FEEDBACK_EMAIL)}
                target="_blank"
                rel="noopener noreferrer"
                title="Compose in Gmail (web)"
                className="underline underline-offset-2 hover:text-indigo-100"
              >
                {FEEDBACK_EMAIL}
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
