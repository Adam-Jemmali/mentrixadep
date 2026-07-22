"use client";

import Link from "next/link";
import { useState } from "react";
import { MentrixaLogoMark } from "@/components/mentrixa-logo";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { LandingNavWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { cn } from "@/shared/core/utils";

/** Landing nav — gradient typewriter wordmark like student hub. */
export function MarketingLandingNav() {
  const [open, setOpen] = useState(false);
  const { nav } = LANDING_E;

  const anchorLink = (href: string, label: string, className?: string) => (
    <Link
      href={href}
      prefetch={false}
      onClick={() => setOpen(false)}
      className={cn(
        "cursor-pointer text-[11px] font-semibold text-[var(--mx-muted,#9CA3AF)] transition-colors hover:text-white sm:text-xs",
        className,
      )}
    >
      <LandingNavWord label={label} surface="dark" />
    </Link>
  );

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-white/10",
          "bg-[var(--mx-navy,#0B1220)]/90 px-4 backdrop-blur-md sm:px-6",
        )}
        aria-label="Primary"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-2">
            <MentrixaLogoMark size="sm" className="shrink-0 opacity-95" priority />
            <MentrixaWordmark trixaClassName="text-white" />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:gap-3 xl:flex">
            {nav.items.map((item) => (
              <span key={item.href}>{anchorLink(item.href, item.label)}</span>
            ))}
            {anchorLink("/arena", nav.liveArena, "text-white/90")}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href={nav.signInHref}
              prefetch={false}
              className="hidden cursor-pointer text-[11px] font-semibold text-[var(--mx-muted,#9CA3AF)] transition-colors hover:text-white sm:inline sm:text-xs"
            >
              {nav.signIn}
            </Link>
            <Link
              href={nav.rankHref}
              prefetch={false}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center rounded-full",
                "bg-[var(--mx-violet,#7C3AED)] px-3 py-1.5 text-[11px] font-bold text-white sm:px-4 sm:py-2 sm:text-[13px]",
                "transition-colors hover:bg-[#6D28D9]",
              )}
            >
              {nav.rankCta}
            </Link>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white xl:hidden"
              aria-expanded={open}
              aria-controls="landing-mobile-nav"
              onClick={() => setOpen((value) => !value)}
            >
              Menu
            </button>
          </div>
        </div>
      </nav>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="fixed inset-x-0 top-14 z-40 border-b border-white/10 bg-[var(--mx-navy,#0B1220)]/95 px-4 py-4 backdrop-blur-md xl:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            {nav.items.map((item) => (
              <span key={item.href}>{anchorLink(item.href, item.label, "text-sm")}</span>
            ))}
            {anchorLink("/arena", nav.liveArena, "text-sm text-white")}
            {anchorLink(nav.signInHref, nav.signIn, "text-sm")}
          </div>
        </div>
      ) : null}
    </>
  );
}
