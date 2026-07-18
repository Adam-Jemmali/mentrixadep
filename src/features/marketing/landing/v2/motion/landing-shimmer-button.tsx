"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variants = {
  primary:
    "border border-[#6366F1] bg-[#7C3AED] text-white shadow-[2px_4px_0_#0B1220] hover:bg-[#6D28D9]",
  secondary: landingHub.btnSecondary,
  ghost:
    "border border-[#A5B4FC] bg-white text-[#4F46E5] shadow-[2px_3px_0_rgba(11,18,32,0.08)] hover:border-[#6366F1] hover:bg-[#EDE9FE]",
};

/** CSS-only CTA — keeps framer-motion off the hero critical path. */
export function LandingShimmerButton({
  href,
  children,
  variant = "primary",
  className,
}: Props) {
  return (
    <div className="lp-shimmer-btn relative inline-flex w-full sm:w-auto">
      {variant === "primary" ? (
        <span aria-hidden className="lp-shimmer-btn__sheen pointer-events-none absolute -inset-px overflow-hidden rounded-xl" />
      ) : null}
      <Link
        href={href}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-bold tracking-tight transition-[transform,colors] duration-200 will-change-transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] sm:w-auto",
          variants[variant],
          className,
        )}
      >
        {children}
      </Link>
    </div>
  );
}
