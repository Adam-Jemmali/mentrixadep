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

/** CSS-only CTA — keeps framer-motion off the hero critical path. No shimmer sheen (GPU paint cost). */
export function LandingShimmerButton({
  href,
  children,
  variant = "primary",
  className,
}: Props) {
  return (
    <div className="relative inline-flex w-full sm:w-auto">
      <Link
        href={href}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-bold tracking-tight transition-colors duration-150 sm:w-auto",
          variants[variant],
          className,
        )}
      >
        {children}
      </Link>
    </div>
  );
}
