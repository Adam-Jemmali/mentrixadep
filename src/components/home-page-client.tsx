"use client";

/**
 * Marketing landing — visual-first, outcome & ROI copy. Motion via CSS (`globals.css` `.lp-*`).
 */

import { useEffect, useRef, useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import PricingSection from "@/components/ui/pricing";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
  NavbarLogo,
} from "@/components/ui/resizable-navbar";
import { ContactSocialLinks } from "@/components/contact/contact-social-links";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/lib/mentrixa-brand";
import { markLandingSection, useLandingPerfMetrics, useLowEndMode } from "@/lib/landing-perf";

const ICON_VERSION = "20260410";

function useInViewOnce<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin, threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, visible] as const;
}


const ArrowRight = memo(function ArrowRight() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
});

const RoleIcon = memo(function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <span className={`relative inline-block h-4 w-4 shrink-0 ${className}`} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        fill
        unoptimized
        className="object-contain"
        sizes="16px"
      />
    </span>
  );
});

const LANDING_NAV_ITEMS = [
  { name: "Features", link: "#features" },
  { name: "Why join", link: "#why" },
  { name: "Flow", link: "#flow" },
  { name: "Pricing", link: "#pricing" },
  { name: "Contact", link: "#contact" },
  { name: "Sign in", link: "/auth/signin" },
];

const FEEDBACK_EMAIL = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

export function HomePageClient() {
  const [ctaRef, ctaVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const [contactRef, contactVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const track = useTrack();
  const lowEndMode = useLowEndMode();
  const enablePerfMetrics = process.env.NODE_ENV !== "production" && !lowEndMode;
  useLandingPerfMetrics(enablePerfMetrics);

  useEffect(() => {
    track("page_view_landing");
  }, [track]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const query = url.searchParams;
    const hashRaw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const hash = new URLSearchParams(hashRaw);

    // Supabase recovery links can occasionally land on SITE_URL (/) with hash tokens.
    // Forward to reset-password while preserving tokens so session bootstrap can complete.
    if (
      hash.get("type") === "recovery" &&
      (hash.get("access_token") || hash.get("refresh_token") || hash.get("token_hash"))
    ) {
      window.location.replace(`/auth/reset-password#${hash.toString()}`);
      return;
    }

    // Support query-based recovery links that hit "/" unexpectedly.
    const queryType = query.get("type");
    const queryCode = query.get("code");
    const queryTokenHash = query.get("token_hash");
    if (queryType === "recovery" && (queryCode || queryTokenHash)) {
      const next = new URLSearchParams();
      next.set("type", "recovery");
      if (queryCode) next.set("code", queryCode);
      if (queryTokenHash) next.set("token_hash", queryTokenHash);
      window.location.replace(`/auth/reset-password?${next.toString()}`);
      return;
    }

    // Expired recovery links should send user to request a fresh email.
    if (query.get("error_code") === "otp_expired" || hash.get("error_code") === "otp_expired") {
      window.location.replace("/auth/forgot-password?error=expired");
    }
  }, []);

  useEffect(() => {
    const cleanups = [
      markLandingSection("firstseq", "hero-sequence"),
      markLandingSection("secondseq", "outcome-sequence"),
      markLandingSection("thirdstatic", "features"),
      markLandingSection("fourthseq", "flow-sequence"),
      markLandingSection("fourthstatic", "path-roles"),
      markLandingSection("pricing", "pricing"),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return (
    <div className="lp-root">
      <Navbar className="lp-nav fixed top-3 left-0 right-0 z-50 px-3 sm:px-5">
        <div className="relative w-full">
          <NavBody>
            <NavbarLogo />
            <NavItems items={LANDING_NAV_ITEMS} />
            <div className="flex items-center gap-2 flex-shrink-0">
              <NavbarButton
                href="/auth/signup?role=tutor"
                variant="secondary"
                className="hidden sm:inline-flex"
              >
                <RoleIcon role="guide" className="h-3.5 w-3.5" />
                Become a Guide
              </NavbarButton>
              <NavbarButton href="/auth/signup" variant="primary" className="hidden sm:inline-flex">
                <RoleIcon role="mentrixer" className="h-3.5 w-3.5 brightness-0 invert" />
                Become a Mentrixer
              </NavbarButton>
            </div>
          </NavBody>

          <MobileNav>
            <div className="relative w-full">
              <MobileNavHeader>
                <NavbarLogo />
                <MobileNavToggle isOpen={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)} />
              </MobileNavHeader>

              <MobileNavMenu isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
                {LANDING_NAV_ITEMS.map((item) => (
                  <a
                    key={item.link}
                    href={item.link}
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/8 hover:text-white"
                  >
                    {item.name}
                  </a>
                ))}

                <div className="mt-2 flex flex-col gap-2">
                  <NavbarButton
                    href="/auth/signup?role=tutor"
                    variant="secondary"
                    className="w-full"
                  >
                    <RoleIcon role="guide" className="h-3.5 w-3.5" />
                    Become a Guide
                  </NavbarButton>
                  <NavbarButton href="/auth/signup" variant="primary" className="w-full">
                    <RoleIcon role="mentrixer" className="h-3.5 w-3.5 brightness-0 invert" />
                    Become a Mentrixer
                  </NavbarButton>
                </div>
              </MobileNavMenu>
            </div>
          </MobileNav>
        </div>
      </Navbar>

      <PricingSection />

      <section
        ref={ctaRef}
        className={cn(
          "lp-band-cta relative overflow-hidden py-14 md:py-18 transition-all duration-700",
          ctaVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        )}
      >
        <Image
          src="/sequences-webp/end-mentrixa.webp"
          alt="Mentrixa end section background"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-slate-950/45" aria-hidden />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-5">
          <h2 className="text-balance font-bold text-white text-[clamp(24px,7vw,46px)] tracking-[-0.04em] leading-[1.05] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-[clamp(28px,4.4vw,46px)]">
           Your Guide is available today. Become the #1 Mentrixer. Prove what you know.
          </h2>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              <RoleIcon role="mentrixer" className="h-3.5 w-3.5" />
              Become a Mentrixer <ArrowRight />
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/25 px-8 py-3.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/10 sm:w-auto"
            >
              <RoleIcon role="guide" className="h-3.5 w-3.5 brightness-0 invert" />
              Become a Guide
            </Link>
          </div>
        </div>
      </section>

      

      <section
        ref={contactRef}
        id="contact"
        className={cn(
          "lp-band-contact py-10 md:py-14 border-t border-white/[0.06] transition-all duration-700",
          contactVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="max-w-3xl mx-auto px-4 text-center sm:px-5">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-300/80 mb-3">Contact + feedback</p>
          <h2 className="font-bold text-white text-[clamp(22px,6vw,32px)] tracking-[-0.03em] leading-tight sm:text-[clamp(22px,3.5vw,32px)]">
            You are why we ship
          </h2>
          <p className="mt-4 text-sm text-slate-200 max-w-xl mx-auto leading-relaxed">
            Questions, ideas, or a rant about your last session ? We read every message!
          </p>
          <div className="mt-8 flex justify-center">
            <ContactSocialLinks variant="dark" />
          </div>
          <div className="mt-10">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1120] bg-white px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/15 hover:-translate-y-0.5 transition-all"
            >
              Contact Mentrixa
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer-bg px-4 py-10 sm:px-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <MentrixaLogoMark size="sm" className="opacity-90" />
                <span className="text-[15px] font-bold text-white tracking-tight">Mentrixa</span>
              </Link>
          
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center md:gap-10">
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <Link href="/privacy" className="text-indigo-100/85 hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-indigo-100/85 hover:text-white transition-colors">
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="font-semibold text-white border-b border-indigo-400/50 hover:border-indigo-300 pb-0.5 transition-colors"
                >
                </Link>
              </nav>
              <ContactSocialLinks variant="footer" />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-300 order-2 sm:order-1">
              &copy; {new Date().getFullYear()} Mentrixa 
            </p>
            <span className="order-1 sm:order-2 text-[12px] text-indigo-300/70 sm:text-right">
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
    </div>
  );
}
