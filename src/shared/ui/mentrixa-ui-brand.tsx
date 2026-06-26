"use client";

import Image from "next/image";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";

export type MentrixaBrandKind = "mentrixa" | "mentrixer" | "guide";

const KIND_LABEL: Record<MentrixaBrandKind, string> = {
  mentrixa: "Mentrixa",
  mentrixer: "Mentrixer",
  guide: "Guide",
};

const ICON_CLASS: Record<Exclude<MentrixaBrandKind, "mentrixa">, string> = {
  mentrixer: "text-violet-500",
  guide: "text-indigo-500",
};

const ICON_PX = { xs: 12, sm: 16, md: 20 } as const;

export function MentrixaBrandMark({
  kind = "mentrixa",
  size = "sm",
  className,
}: {
  kind?: MentrixaBrandKind;
  size?: keyof typeof ICON_PX;
  className?: string;
}) {
  const px = ICON_PX[size];

  if (kind === "mentrixa") {
    return (
      <Image
        src={MENTRIXA_LOGO_PNG}
        alt=""
        width={px}
        height={px}
        className={cn("shrink-0 object-contain", className)}
        aria-hidden
      />
    );
  }

  const Icon = kind === "guide" ? GraduationCap : ShieldCheck;
  return (
    <Icon
      className={cn("shrink-0", ICON_CLASS[kind], size === "xs" && "h-3 w-3", size === "sm" && "h-4 w-4", size === "md" && "h-5 w-5", className)}
      aria-hidden
    />
  );
}

export function MentrixaBrandLabel({
  kind = "mentrixa",
  label,
  className,
  markClassName,
}: {
  kind?: MentrixaBrandKind;
  label: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <MentrixaBrandMark kind={kind} size="xs" className={markClassName} />
      <span>{label}</span>
    </span>
  );
}

export function MentrixaTooltipBrandHeader({
  kind = "mentrixa",
  tone = "dark",
  className,
}: {
  kind?: MentrixaBrandKind;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 flex items-center gap-1.5 border-b pb-1.5",
        tone === "dark" ? "border-white/10" : "border-slate-200",
        className,
      )}
    >
      <MentrixaBrandMark kind={kind} size="xs" />
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.12em]",
          tone === "dark" ? "text-slate-400" : "text-slate-500",
        )}
      >
        {KIND_LABEL[kind]}
      </span>
    </div>
  );
}

/** Faint centered logo for skeleton / loading shells. */
export function MentrixaSkeletonWatermark({
  kind = "mentrixa",
  className,
}: {
  kind?: MentrixaBrandKind;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <MentrixaBrandMark
        kind={kind}
        size="md"
        className={cn(kind === "mentrixa" ? "opacity-[0.14]" : "opacity-30")}
      />
    </div>
  );
}
