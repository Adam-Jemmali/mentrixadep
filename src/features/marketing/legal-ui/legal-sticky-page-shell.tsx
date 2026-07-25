"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/features/marketing/mentrixa-brand";

export type LegalStickySection = {
  title: string;
  content: string;
};

const STICKY_VARIANTS = ["curl", "taped", "clip", "pinned"] as const;

export function LegalStickyPageShell({
  pageEyebrow,
  pageTitle,
  lastUpdated,
  sections,
  contactHeading = "Contact",
  contactBlurb,
}: {
  pageEyebrow: string;
  pageTitle: string;
  lastUpdated: string;
  sections: LegalStickySection[];
  contactHeading?: string;
  contactBlurb: string;
}) {
  const feedbackEmail = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

  return (
    <div className={landingHub.pageRoot}>
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <LandingStickyCard
          variant="clip"
          rotate={false}
          className="mb-8 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
        >
          <Link href="/" prefetch={false} className="flex items-center gap-2">
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" />
            <MentrixaWordmark className="text-base sm:text-lg" />
          </Link>
          <Link href="/" prefetch={false} className={landingHub.linkBack}>
            Back home
          </Link>
        </LandingStickyCard>

        <LandingStickyCard variant="pinned" className="mb-6 text-center rotate-[0.25deg] px-5 py-7 sm:px-7">
          <p className={landingHub.eyebrow}>{pageEyebrow}</p>
          <h1 className={`mt-2 ${landingHub.title}`}>{pageTitle}</h1>
          <p className={`mt-3 ${landingHub.bodySm}`}>Last updated {lastUpdated}</p>
        </LandingStickyCard>

        <div className="space-y-5">
          {sections.map((section, idx) => {
            const variant = STICKY_VARIANTS[idx % STICKY_VARIANTS.length];
            const rotateClass = idx % 2 === 0 ? "rotate-[-0.4deg]" : "rotate-[0.35deg]";
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.35 }}
              >
                <LandingStickyCard variant={variant} className={rotateClass}>
                  <h2 className="text-xl font-bold leading-snug text-[#0B1220]">{section.title}</h2>
                  <p className={`mt-3 ${landingHub.body}`}>{section.content}</p>
                </LandingStickyCard>
              </motion.div>
            );
          })}
        </div>

        <LandingStickyCard variant="taped" className="mt-8 text-center rotate-[0.2deg] px-5 py-7 sm:px-7">
          <h2 className={landingHub.title}>{contactHeading}</h2>
          <p className={`mx-auto mt-3 max-w-lg ${landingHub.body}`}>{contactBlurb}</p>
          <p className="mt-4">
            <a
              href={gmailWebComposeUrl(feedbackEmail)}
              target="_blank"
              rel="noopener noreferrer"
              title="Compose in Gmail (web)"
              className="text-base font-semibold text-[#4F46E5] underline underline-offset-2 hover:text-[#0B1220]"
            >
              {feedbackEmail}
            </a>
          </p>
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#475569]">
            <Link href="/privacy" className="hover:text-[#0B1220]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#0B1220]">
              Terms
            </Link>
            <Link href="/contact" className="text-[#4F46E5] hover:text-[#0B1220]">
              Contact
            </Link>
          </nav>
        </LandingStickyCard>
      </div>
    </div>
  );
}
