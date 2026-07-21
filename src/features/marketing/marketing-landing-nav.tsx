"use client";

import Link from "next/link";
import { LANDING_E } from "@/features/marketing/landing/landing-copy-pure";
import { cn } from "@/shared/core/utils";

/**
 * Sprint E landing nav — fixed 56px, dark navy, blur. No framer-motion.
 */
export function MarketingLandingNav() {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-white/10",
        "bg-[var(--mx-navy,#0B1220)]/90 px-4 backdrop-blur-md sm:px-6",
      )}
      aria-label="Primary"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Link
          href="/"
          prefetch={false}
          className="justify-self-start text-[15px] font-bold tracking-[0.06em] text-[var(--mx-violet,#7C3AED)]"
        >
          MENTRIXA
        </Link>

        <Link
          href="/arena"
          prefetch={false}
          className="cursor-pointer justify-self-center text-xs font-semibold text-[var(--mx-muted,#9CA3AF)] transition-colors hover:text-white sm:text-sm"
        >
          {LANDING_E.nav.liveArena}
        </Link>

        <Link
          href={LANDING_E.nav.rankHref}
          prefetch={false}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center justify-self-end rounded-full",
            "bg-[var(--mx-violet,#7C3AED)] px-3 py-1.5 text-[11px] font-bold text-white sm:px-4 sm:py-2 sm:text-[13px]",
            "transition-colors hover:bg-[#6D28D9]",
          )}
        >
          {LANDING_E.nav.rankCta}
        </Link>
      </div>
    </nav>
  );
}
