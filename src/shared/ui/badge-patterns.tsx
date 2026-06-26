"use client";

import type { ReactNode } from "react";
import { Badge } from "@/shared/ui/hero-badge";
import { cn } from "@/shared/core/utils";
import { formatBadgeCount } from "@/shared/ui/badge-messages-pure";

export type MentrixaBadgeColor = "default" | "accent" | "success" | "warning" | "danger";

export type MentrixaBadgePlacement =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

const COLOR_CLASS: Record<MentrixaBadgeColor, string> = {
  default: "mentrixa-badge--default",
  accent: "mentrixa-badge--accent",
  success: "mentrixa-badge--success",
  warning: "mentrixa-badge--warning",
  danger: "mentrixa-badge--danger",
};

export function MentrixaCountBadge({
  count,
  color = "danger",
  size = "sm",
  variant = "primary",
  className,
  label,
  children,
}: {
  count: number;
  color?: MentrixaBadgeColor;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "soft";
  className?: string;
  label?: string;
  children?: ReactNode;
}) {
  const formatted = formatBadgeCount(count);
  if (!children && !formatted) return null;

  return (
    <Badge
      color={color}
      size={size}
      variant={variant}
      className={cn("mentrixa-badge", COLOR_CLASS[color], className)}
      aria-label={label}
    >
      {children ?? formatted}
    </Badge>
  );
}

export function MentrixaStatusDot({
  color = "success",
  size = "sm",
  placement = "bottom-right",
  className,
  "aria-label": ariaLabel = "Status indicator",
}: {
  color?: MentrixaBadgeColor;
  size?: "sm" | "md" | "lg";
  placement?: MentrixaBadgePlacement;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Badge
      color={color}
      size={size}
      variant="primary"
      placement={placement}
      className={cn("mentrixa-badge mentrixa-badge--dot", COLOR_CLASS[color], className)}
      aria-label={ariaLabel}
    />
  );
}

export function MentrixaAvatarBadge({
  children,
  count = 0,
  color = "danger",
  placement = "top-right",
  showZero = false,
  dot,
  dotColor = "success",
  dotPlacement = "bottom-right",
  countLabel,
  className,
}: {
  children: ReactNode;
  count?: number;
  color?: MentrixaBadgeColor;
  placement?: MentrixaBadgePlacement;
  showZero?: boolean;
  dot?: boolean;
  dotColor?: MentrixaBadgeColor;
  dotPlacement?: MentrixaBadgePlacement;
  countLabel?: string;
  className?: string;
}) {
  const formatted = formatBadgeCount(count);
  const showCount = showZero ? count > 0 || formatted === "0" : Boolean(formatted);

  return (
    <Badge.Anchor className={cn("mentrixa-badge-anchor inline-flex", className)}>
      {children}
      {showCount ? (
        <Badge
          color={color}
          size="sm"
          variant="primary"
          placement={placement}
          className={cn("mentrixa-badge", COLOR_CLASS[color])}
          aria-label={countLabel}
        >
          {formatted}
        </Badge>
      ) : null}
      {dot && !showCount ? (
        <MentrixaStatusDot
          color={dotColor}
          placement={dotPlacement}
          aria-label={countLabel ?? "Status indicator"}
        />
      ) : null}
    </Badge.Anchor>
  );
}
