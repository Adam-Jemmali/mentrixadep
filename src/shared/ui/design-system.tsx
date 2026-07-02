"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon, XpIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { motion, AnimatePresence } from "framer-motion";

// ─── GradientText ─────────────────────────────────────────────────────────────
export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("gradient-text", className)}>{children}</span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  as?: "div" | "section" | "article";
}

export function DSCard({ children, className, hover = false, glow = false, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-white rounded-2xl border border-surface-border shadow-card p-6",
        hover && "card-hover cursor-pointer",
        glow && "ring-2 ring-brand-500/20",
        className
      )}
    >
      {children}
    </Tag>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "blue" | "green" | "amber" | "red" | "purple" | "gray";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  blue:   "bg-brand-50 text-brand-700 border border-brand-200",
  green:  "bg-success-light text-success border border-success-border",
  amber:  "bg-warning-light text-warning border border-warning-border",
  red:    "bg-danger-light text-danger border border-danger-border",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  gray:   "bg-surface-muted text-text-muted border border-surface-border",
};

export function DSBadge({
  children,
  variant = "blue",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn("badge", badgeVariantClasses[variant], className)}>
      {children}
    </span>
  );
}

// ─── XPBar ────────────────────────────────────────────────────────────────────
export function XPBar({
  current,
  max,
  className,
}: {
  current: number;
  max: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((current / Math.max(max, 1)) * 100));
  return (
    <div className={cn("xp-bar", className)}>
      <div
        className="xp-bar-fill"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = { sm: "w-4 h-4 border-2", md: "w-8 h-8 border-2", lg: "w-12 h-12 border-[3px]" };
  return (
    <div
      className={cn(
        "rounded-full border-brand-200 border-t-brand-600 animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── EmptyIllustration ────────────────────────────────────────────────────────
export function EmptyIllustration({
  title = "Nothing here yet",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center py-16 gap-4", className)}>
      <div className="w-20 h-20 rounded-3xl bg-brand-50 border border-brand-100 flex items-center justify-center shadow-glow-sm">
        <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
          <rect x="8" y="12" width="24" height="30" rx="3" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
          <rect x="12" y="8" width="24" height="30" rx="3" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
          <line x1="17" y1="18" x2="31" y2="18" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="17" y1="23" x2="31" y2="23" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="17" y1="28" x2="25" y2="28" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="37" cy="11" r="5" fill="#FCD34D" />
          <path d="M37 8.5v2.5l1.5 1.5" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="font-semibold text-text-primary">{title}</p>
        {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
      </div>
    </div>
  );
}

// ─── FloatingXP ───────────────────────────────────────────────────────────────
export function FloatingXP({ amount }: { amount: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -40, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className="pointer-events-none absolute z-50 font-bold text-brand-600 text-sm select-none"
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── StreakBadge ──────────────────────────────────────────────────────────────
export function StreakBadge({
  count,
  pulse = false,
  className,
}: {
  count: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
        "bg-amber-50 text-amber-700 border border-amber-200",
        pulse && "animate-pulse-glow",
        className
      )}
    >
      <MentrixaVocabIcon name="streak" size={15} className="text-orange-500" title="Streak" />
      {count}
    </span>
  );
}

// ─── LevelBadge ──────────────────────────────────────────────────────────────
type LevelTier = "Bronze" | "Silver" | "Gold" | "Platinum";

const levelStyles: Record<LevelTier, string> = {
  Bronze:   "bg-amber-50   text-amber-700  border border-amber-200",
  Silver:   "bg-slate-50   text-slate-600  border border-slate-200",
  Gold:     "bg-yellow-50  text-yellow-700 border border-yellow-200",
  Platinum: "bg-cyan-50    text-cyan-700   border border-cyan-200",
};

const levelIcons: Record<LevelTier, string> = {
  Bronze:   "🥉",
  Silver:   "🥈",
  Gold:     "🥇",
  Platinum: "💎",
};

export function LevelBadge({
  tier,
  className,
}: {
  tier: LevelTier;
  className?: string;
}) {
  return (
    <span className={cn("badge text-xs font-bold", levelStyles[tier], className)}>
      {levelIcons[tier]} {tier}
    </span>
  );
}

// ─── XPStatCard ───────────────────────────────────────────────────────────────
export function XPStatCard({
  totalXp,
  streak,
  level,
  xpToNext,
  className,
}: {
  totalXp: number;
  streak: number;
  level?: string;
  xpToNext?: number;
  className?: string;
}) {
  return (
    <DSCard className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <XpIcon size={18} title="XP" />
          </div>
          <div>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Total XP</p>
            <p className="text-xl font-bold text-text-primary">{totalXp.toLocaleString()}</p>
          </div>
        </div>
        <StreakBadge count={streak} />
      </div>
      {xpToNext !== undefined && (
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>{level}</span>
            <span>{xpToNext} XP to next</span>
          </div>
          <XPBar current={totalXp} max={totalXp + xpToNext} />
        </div>
      )}
    </DSCard>
  );
}
