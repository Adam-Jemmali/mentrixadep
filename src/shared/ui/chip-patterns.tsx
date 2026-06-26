"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";
import { Chip } from "@/shared/ui/hero-chip";
import { MentrixaMetaTag } from "@/shared/ui/meta-tag-patterns";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import type { PricingTierId } from "@/features/pricing/pricing-tiers-pure";
import {
  sessionStatusChipPresentation,
  subscriptionTierChipPresentation,
  type MentrixaChipVisual,
} from "@/shared/ui/chip-messages-pure";

export type MentrixaChipTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaChipTone, string> = {
  light: "mentrixa-chip--light",
  dark: "mentrixa-chip--dark",
};

const VISUAL_CLASS: Record<MentrixaChipVisual, string> = {
  default: "mentrixa-chip--default",
  accent: "mentrixa-chip--accent",
  success: "mentrixa-chip--success",
  warning: "mentrixa-chip--warning",
  danger: "mentrixa-chip--danger",
  verified: "mentrixa-chip--verified",
};

const HERO_COLOR: Record<
  MentrixaChipVisual,
  "default" | "accent" | "success" | "warning" | "danger"
> = {
  default: "default",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  verified: "warning",
};

export function MentrixaChip({
  children,
  visual = "accent",
  tone = "light",
  size = "sm",
  brandKind,
  className,
}: {
  children: ReactNode;
  visual?: MentrixaChipVisual;
  tone?: MentrixaChipTone;
  size?: "sm" | "md" | "lg";
  brandKind?: MentrixaBrandKind;
  className?: string;
}) {
  return (
    <Chip
      size={size}
      variant="soft"
      color={HERO_COLOR[visual]}
      className={cn(
        "mentrixa-chip",
        TONE_CLASS[tone],
        VISUAL_CLASS[visual],
        className,
      )}
    >
      {brandKind ? (
        <MentrixaBrandMark kind={brandKind} size="xs" className="shrink-0 opacity-85" />
      ) : null}
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}

export function SkillTagChip({
  label,
  verified = false,
  tone = "light",
  className,
}: {
  label: string;
  verified?: boolean;
  tone?: MentrixaChipTone;
  className?: string;
}) {
  return (
    <MentrixaMetaTag
      variant={verified ? "verified" : "skill"}
      tone={tone}
      className={className}
    >
      {label}
    </MentrixaMetaTag>
  );
}

export function SessionStatusChip({
  status,
  tone = "light",
  className,
}: {
  status?: string | null;
  tone?: MentrixaChipTone;
  className?: string;
}) {
  const presentation = sessionStatusChipPresentation(status);
  return (
    <MentrixaChip
      visual={presentation.visual}
      tone={tone}
      className={cn("mentrixa-chip--status", className)}
    >
      {presentation.label}
    </MentrixaChip>
  );
}

export function SubscriptionTierChip({
  tier,
  active = false,
  label,
  tone = "light",
  className,
}: {
  tier: PricingTierId;
  active?: boolean;
  label?: string;
  tone?: MentrixaChipTone;
  className?: string;
}) {
  const presentation = subscriptionTierChipPresentation(tier, { active });
  const brandKind: MentrixaBrandKind | undefined =
    tier === "breakthrough" ? "guide" : tier === "momentum" ? "mentrixa" : undefined;

  return (
    <MentrixaChip
      visual={presentation.visual}
      tone={tone}
      brandKind={brandKind}
      className={cn("mentrixa-chip--tier", className)}
    >
      {label ?? presentation.label}
    </MentrixaChip>
  );
}

export function CourseTagChip({
  course,
  tone = "light",
  className,
}: {
  course: string;
  tone?: MentrixaChipTone;
  className?: string;
}) {
  return (
    <MentrixaChip
      visual="default"
      tone={tone}
      className={cn("mentrixa-chip--course font-mono", className)}
    >
      {course}
    </MentrixaChip>
  );
}
