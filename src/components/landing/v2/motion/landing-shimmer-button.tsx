"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLandingMotion } from "@/components/landing/v2/motion/use-landing-motion";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variants = {
  primary:
    "lp-cta-premium bg-white text-[#0B1120] shadow-[0_0_40px_rgba(99,102,241,0.35),0_8px_32px_rgba(0,0,0,0.35)] hover:shadow-[0_0_56px_rgba(124,58,237,0.45),0_12px_40px_rgba(0,0,0,0.4)]",
  secondary:
    "border border-white/20 bg-white/[0.04] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/30 hover:bg-white/[0.08]",
  ghost:
    "border border-white/10 bg-white/[0.06] text-white/95 hover:bg-white/[0.1]",
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
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
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
