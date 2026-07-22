"use client";

import Image from "next/image";
import { cn } from "@/shared/core/utils";
import { RANK_ICON_ON_LIGHT_FILTER, RANK_ICON_VERSION } from "@/features/xp/rank-icon-contrast";

export type LandingRole = "mentrixer" | "guide";

const SIZE_PX = { sm: 22, md: 30, lg: 38, xl: 46 } as const;

export function LandingRoleIcon({
  role,
  size = "md",
  className,
  surface = "light",
}: {
  role: LandingRole;
  size?: keyof typeof SIZE_PX;
  className?: string;
  surface?: "light" | "dark";
}) {
  const px = SIZE_PX[size];
  const src =
    role === "mentrixer"
      ? `/icons/mentrixer.svg?v=${RANK_ICON_VERSION}`
      : `/icons/guide.svg?v=${RANK_ICON_VERSION}`;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        unoptimized
        className="size-full object-contain"
        sizes={`${px}px`}
        style={surface === "light" ? { filter: RANK_ICON_ON_LIGHT_FILTER } : undefined}
      />
    </span>
  );
}

export function landingRoleFromLabel(label: string): LandingRole | null {
  const word = label.trim();
  if (/^guides?$/i.test(word)) return "guide";
  if (/^mentrixers?$/i.test(word)) return "mentrixer";
  return null;
}
