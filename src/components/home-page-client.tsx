"use client";

/**
 * Marketing landing — visual-first, outcome & ROI copy. Motion via CSS (`globals.css` `.lp-*`).
 */

import { useEffect, useRef, useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTrack } from "@/lib/use-track";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { ContactSocialLinks } from "@/components/contact/contact-social-links";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL, gmailWebComposeUrl } from "@/lib/mentrixa-brand";

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

const Check = memo(function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
});

const RoleIcon = memo(function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <Image
      src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
      alt=""
      width={16}
      height={16}
      unoptimized
      className={`block ${className}`}
      aria-hidden
    />
  );
});

const WatermarkRoleIcon = memo(function WatermarkRoleIcon({ role }: { role: "mentrixer" | "guide" }) {
  return (
    <Image
      src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
      alt=""
      width={128}
      height={128}
      unoptimized
      aria-hidden
      className="h-20 w-20 object-contain opacity-12 blur-[1px] brightness-125"
    />
  );
});
const PRICING_POINTS = [
  "Your account is free. Browse every Guide. Read every profile. Pay nothing until you click Book.",
  "The price you see is the price you pay. The 15% platform fee is already inside it. No surprise charges at checkout.",
  "Every Guide sets their own rate between $15 and $60 CAD per session. You see the price before you book. Always!",
  "Checkout is Stripe. Your card data never touches our servers. If you are a Guide, your payout clears after every session you complete.",
];

const FEEDBACK_EMAIL = DEFAULT_PUBLIC_FEEDBACK_EMAIL;

export function HomePageClient() {
  const [pricingRef, pricingVis] = useInViewOnce<HTMLElement>("0px 0px -14% 0px");
  const [ctaRef, ctaVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const [contactRef, contactVis] = useInViewOnce<HTMLElement>("0px 0px -12% 0px");
  const track = useTrack();

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

  return (
    <div className="lp-root">
      <nav className="lp-nav fixed top-3 left-0 right-0 z-50 group px-3 sm:px-5">
        <div className="relative mx-auto max-w-6xl">
          {/* Outer hull border (custom prism shape) */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-300/35 via-white/15 to-blue-300/35"
            style={{
              clipPath:
                "polygon(0 36%, 4% 10%, 28% 10%, 31% 0, 69% 0, 72% 10%, 96% 10%, 100% 36%, 100% 100%, 0 100%)",
              contain: "layout paint",
            }}
          />

          {/* Inner hull fill */}
          <div
            className="absolute inset-[1px] bg-gradient-to-r from-slate-950/88 via-slate-900/90 to-slate-950/88 backdrop-blur-md"
            style={{
              clipPath:
                "polygon(0 37%, 4.2% 11.5%, 28.5% 11.5%, 31.5% 1.2%, 68.5% 1.2%, 71.5% 11.5%, 95.8% 11.5%, 100% 37%, 100% 100%, 0 100%)",
              contain: "layout paint",
            }}
          />

          {/* Left fin */}
          <div
            className="pointer-events-none absolute -left-1 top-4 h-7 w-8 bg-gradient-to-r from-cyan-300/25 to-transparent"
            style={{ clipPath: "polygon(0 52%, 100% 0, 100% 100%)" }}
          />

          {/* Right fin */}
          <div
            className="pointer-events-none absolute -right-1 top-4 h-7 w-8 bg-gradient-to-l from-blue-300/25 to-transparent"
            style={{ clipPath: "polygon(0 0, 100% 52%, 0 100%)" }}
          />

          {/* Energy seam */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-cyan-200/70 via-cyan-200/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            style={{ contain: "layout paint" }}
          />

          {/* Corner emitters */}
          <div className="pointer-events-none absolute left-5 top-4 h-1.5 w-1.5 rounded-full bg-cyan-200/70 shadow-[0_0_10px_rgba(56,189,248,0.75)]" />
          <div className="pointer-events-none absolute right-5 top-4 h-1.5 w-1.5 rounded-full bg-blue-200/70 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />

          <div className="relative z-10 h-16 px-5 lg:px-10 flex items-center justify-between" style={{ contain: "content" }}>
          <Link href="/" className="flex items-center gap-2.5 text-white font-bold text-[16px] tracking-[-0.04em] flex-shrink-0">
            <MentrixaLogoMark size="sm" className="opacity-95" />
            <span>Mentrixa</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#why" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Why join
            </a>
            <a href="#flow" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Flow
            </a>
            <a href="#pricing" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Pricing
            </a>
            <a href="#contact" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Contact
            </a>
            <Link href="/auth/signin" className="text-[13px] text-indigo-200/75 hover:text-white transition-colors duration-200">
              Sign in
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <Link
              href="/auth/signup?role=tutor"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors duration-200"
            >
              <RoleIcon role="guide" className="h-3.5 w-3.5 brightness-0 invert" />
              Become a Guide
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0B1120] bg-white px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              <RoleIcon role="mentrixer" className="h-3.5 w-3.5" />
              Become a Mentrixer
            </Link>
          </div>
          <Link href="/auth/signup" className="sm:hidden text-[12px] font-semibold text-[#0B1120] bg-white px-3 py-1.5 rounded-lg">
            Join
          </Link>
        </div>
        </div>
      </nav>

      <section
        ref={pricingRef}
        id="pricing"
        className={cn(
          "lp-band-pricing py-16 md:py-20 transition-all duration-500",
          pricingVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] md:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 hidden md:block">
              <WatermarkRoleIcon role="guide" />
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
                <h2 className="mt-3 font-bold text-slate-900 text-[clamp(24px,3vw,36px)] tracking-[-0.03em] leading-tight">
                  Free to compete and progress. You only pay when you book a Guide.
                </h2>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                    <p className="text-3xl font-bold tracking-tight text-slate-900">$15</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">from / hr</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                    <p className="text-3xl font-bold tracking-tight text-slate-900">$60</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">cap / hr</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                    <p className="text-3xl font-bold tracking-tight text-slate-900">15%</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">fee included</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 md:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">What this means</p>
                <div className="mt-4 space-y-3.5 text-left">
                  {PRICING_POINTS.map((p) => (
                    <div key={p} className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-700">
                      <Check className="mt-0.5 shrink-0 text-emerald-600" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={ctaRef}
        className={cn(
          "lp-band-cta relative overflow-hidden py-24 md:py-32 transition-all duration-700",
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
        <div className="relative z-10 mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-balance font-bold text-white text-[clamp(28px,4.4vw,46px)] tracking-[-0.04em] leading-[1.05] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            Your exam does not care that you haven&apos;t started yet. Your Guide is available today.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5"
            >
              <RoleIcon role="mentrixer" className="h-3.5 w-3.5" />
              Become a Mentrixer <ArrowRight />
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-8 py-3.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/10"
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
          "lp-band-contact py-16 md:py-24 border-t border-white/[0.06] transition-all duration-700",
          contactVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        )}
      >
        <div className="max-w-3xl mx-auto px-5 text-center">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-300/80 mb-3">Contact + feedback</p>
          <h2 className="font-bold text-white text-[clamp(22px,3.5vw,32px)] tracking-[-0.03em] leading-tight">
            You are why we ship
          </h2>
          <p className="mt-4 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
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

      <footer className="lp-footer-bg py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <MentrixaLogoMark size="sm" className="opacity-90" />
                <span className="text-[15px] font-bold text-white tracking-tight">Mentrixa</span>
              </Link>
          
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:gap-10">
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                <Link href="/privacy" className="text-indigo-200/55 hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-indigo-200/55 hover:text-white transition-colors">
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="font-semibold text-white border-b border-indigo-400/50 hover:border-indigo-300 pb-0.5 transition-colors"
                >
                  Contact
                </Link>
              </nav>
      
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-500 order-2 sm:order-1">
              &copy; {new Date().getFullYear()} Mentrixa Inc.
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
