"use client";

import { useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_NAV } from "@/features/marketing/landing/landing-copy-pure";
import { cn } from "@/shared/core/utils";

const ICON_VERSION = "20260410";

const RoleIcon = memo(function RoleIcon({
  role,
  className = "",
}: {
  role: "mentrixer" | "guide";
  className?: string;
}) {
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
});

function LandingNavWordmark() {
  return (
    <span className="font-display text-xl font-black tracking-tight">
      <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
        MENTRIXA
      </span>
    </span>
  );
}

const ctaPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-indigo-700";
const ctaSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50";

/**
 * Landing-only nav — no framer-motion, tabler icons, bubble text, or typewriter wordmark.
 * Keeps logo LCP/preload on the critical path with minimal JS.
 */
export function MarketingLandingNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <nav className="lp-nav fixed top-3 left-0 right-0 z-50 px-3 sm:px-5" aria-label="Primary">
      <div className="relative mx-auto w-full max-w-[min(980px,94vw)]">
        <div
          className={cn(
            landingHub.navShell,
            "lp-nav-shell hidden items-center justify-between gap-4 rounded-full px-6 py-2 !text-[#334155] lg:flex",
          )}
        >
          <Link href="/" className="flex shrink-0 items-center gap-2.5" prefetch={false}>
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <LandingNavWordmark />
          </Link>

          <div className="flex flex-1 items-center justify-center gap-1 text-sm font-medium !text-[#475569]">
            {LANDING_NAV.items.map((item) => (
              <a
                key={item.link}
                href={item.link}
                className="rounded-full px-2.5 py-2 text-[13px] text-[#475569] transition-colors hover:bg-[#EDE9FE] hover:text-[#0B1220]"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/auth/signup?role=tutor" className={cn(ctaSecondary, "hidden sm:inline-flex")} prefetch={false}>
              <RoleIcon role="guide" />
              {LANDING_NAV.guideCta}
            </Link>
            <Link href="/auth/signup" className={cn(ctaPrimary, "hidden sm:inline-flex")} prefetch={false}>
              <RoleIcon role="mentrixer" className="brightness-0 invert" />
              {LANDING_NAV.mentrixerCta}
            </Link>
          </div>
        </div>

        <div className="lg:hidden">
          <div
            className={cn(
              landingHub.navShell,
              "lp-nav-mobile-shell flex w-full items-center justify-between rounded-2xl px-4 py-3 !text-[#334155]",
            )}
          >
            <Link href="/" className="flex items-center gap-2.5" prefetch={false}>
              <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
              <LandingNavWordmark />
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#C4B5FD] text-[#334155] transition-colors hover:bg-[#EDE9FE]"
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            >
              {mobileNavOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>

          {mobileNavOpen ? (
            <div
              className={cn(
                landingHub.navShell,
                "lp-nav-mobile-shell mt-2 flex w-full flex-col gap-2 rounded-2xl px-4 py-4 !text-[#334155]",
              )}
            >
              {LANDING_NAV.items.map((item) => (
                <a
                  key={item.link}
                  href={item.link}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#EDE9FE] hover:text-[#0B1220]"
                >
                  {item.name}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  href="/auth/signup?role=tutor"
                  className={cn(ctaSecondary, "w-full")}
                  prefetch={false}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <RoleIcon role="guide" />
                  {LANDING_NAV.guideCta}
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(ctaPrimary, "w-full")}
                  prefetch={false}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <RoleIcon role="mentrixer" className="brightness-0 invert" />
                  {LANDING_NAV.mentrixerCta}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
