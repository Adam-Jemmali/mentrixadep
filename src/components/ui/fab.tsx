"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";

export type FabProps = {
  href: string;
  label: string;
  icon: ReactNode;
  className?: string;
};

export function Fab({ href, label, icon, className }: FabProps) {
  return (
    <motion.div
      className={cn("fixed z-[180] md:hidden", className)}
      style={{
        bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
        right: "max(1rem, env(safe-area-inset-right))",
      }}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 24, delay: 0.2 }}
    >
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "inline-flex h-14 w-14 items-center justify-center rounded-full",
          "bg-[var(--mx-violet)] text-white shadow-lg shadow-[var(--mx-violet)]/35",
          "border border-white/10 transition-colors duration-200",
          "hover:bg-[var(--mx-primary-hover)] active:scale-95",
          "cursor-pointer",
        )}
      >
        {icon}
      </Link>
    </motion.div>
  );
}
