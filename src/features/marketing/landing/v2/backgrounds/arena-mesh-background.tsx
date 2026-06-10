"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

type Props = {
  className?: string;
  variant?: "hero" | "section" | "cta";
  showGrid?: boolean;
  showWatermark?: boolean;
};

export function ArenaMeshBackground({
  className,
  variant = "section",
  showGrid = true,
  showWatermark = true,
}: Props) {
  const { canLoop } = useLandingMotion();

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-0",
          variant === "hero"
            ? "bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.28)_0%,transparent_55%),radial-gradient(ellipse_80%_60%_at_100%_50%,rgba(124,58,237,0.18)_0%,transparent_50%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(56,189,248,0.12)_0%,transparent_45%),linear-gradient(180deg,#0A1022_0%,#0F172A_45%,#020617_100%)]"
            : variant === "cta"
              ? "bg-[radial-gradient(ellipse_90%_70%_at_50%_100%,rgba(79,70,229,0.22)_0%,transparent_55%),linear-gradient(180deg,#0F172A_0%,#0A1022_100%)]"
              : "bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(79,70,229,0.14)_0%,transparent_50%),linear-gradient(180deg,#0A1022_0%,#0F172A_100%)]",
        )}
      />

      {showGrid ? (
        canLoop ? (
          <motion.div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            animate={{ backgroundPosition: ["0px 0px", "48px 48px"] }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        )
      ) : null}

      {showWatermark ? (
        <div className="absolute inset-0 bg-[url('/mentrixalogo/logo.webp')] bg-[length:80px_80px] bg-repeat opacity-[0.04]" />
      ) : null}

      {canLoop ? (
        <>
          <motion.div
            className={cn(
              "absolute rounded-full blur-[100px]",
              variant === "hero"
                ? "-left-32 top-1/4 h-96 w-96 bg-indigo-500/22"
                : "left-1/4 top-0 h-64 w-64 bg-indigo-500/12",
            )}
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.08, 0.95, 1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={cn(
              "absolute rounded-full blur-[90px]",
              variant === "hero"
                ? "-right-24 bottom-1/4 h-80 w-80 bg-violet-600/18"
                : "right-1/4 bottom-0 h-56 w-56 bg-violet-600/10",
            )}
            animate={{
              x: [0, -35, 25, 0],
              y: [0, 25, -15, 0],
              scale: [1, 0.92, 1.06, 1],
            }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          {variant === "hero" ? (
            <motion.div
              className="absolute left-1/2 top-[15%] h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[80px]"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
