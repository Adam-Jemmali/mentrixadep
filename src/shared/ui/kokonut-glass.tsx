import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/shared/core/utils";

export type KokonutGlassProps = {
  children: ReactNode;
  className?: string;
  /** Verified gold ambient glow — only for verified truth surfaces. */
  verifiedGlow?: boolean;
  style?: CSSProperties;
};

/**
 * Kokonut-style frosted glass surface. Token-driven, no hardcoded brand hex.
 */
export function KokonutGlass({
  children,
  className,
  verifiedGlow = false,
  style,
}: KokonutGlassProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border border-white/10",
        "bg-[var(--mx-surface-2)]/72 backdrop-blur-xl",
        verifiedGlow && "shadow-[0_0_12px_2px_var(--mx-node-verified-glow)]",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 42%, transparent 70%)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
