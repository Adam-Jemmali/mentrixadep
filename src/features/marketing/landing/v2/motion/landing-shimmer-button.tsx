"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
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

export function LandingShimmerButton({
  href,
  children,
  variant = "primary",
  className,
}: Props) {
  const { cinematic, hoverLift } = useLandingMotion();

  return (
    <motion.div
      className="relative inline-flex w-full sm:w-auto"
      whileHover={cinematic ? { y: hoverLift, scale: 1.02 } : undefined}
      whileTap={cinematic ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      {cinematic && variant === "primary" ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-px overflow-hidden rounded-xl"
        >
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
          />
        </motion.span>
      ) : null}
      <Link
        href={href}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-bold tracking-tight transition-colors sm:w-auto",
          variants[variant],
          className,
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
