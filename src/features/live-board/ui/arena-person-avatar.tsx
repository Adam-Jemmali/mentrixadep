"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  arenaAvatarAccent,
  arenaAvatarInitial,
} from "@/features/live-board/live-board-avatar-pure";
import { getAccountRankByLevel } from "@/features/xp/rank-icons";
import { cn } from "@/shared/core/utils";

const SIZE_PX = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 96,
} as const;

type Size = keyof typeof SIZE_PX;

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  size?: Size;
  rankLevel?: number;
  live?: boolean;
  className?: string;
};

export function ArenaPersonAvatar({
  displayName,
  avatarUrl,
  size = "md",
  rankLevel,
  live = false,
  className,
}: Props) {
  const [broken, setBroken] = useState(false);
  const px = SIZE_PX[size];
  const ringColor = rankLevel != null ? getAccountRankByLevel(rankLevel).color : "#7C3AED";
  const accent = arenaAvatarAccent(displayName);
  const initial = arenaAvatarInitial(displayName);

  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${ringColor}, ${accent.to})`,
          padding: size === "xl" ? 3 : size === "lg" ? 2.5 : 2,
        }}
      >
        <span className="relative flex h-full w-full overflow-hidden rounded-full bg-[#0B1220]">
          {avatarUrl && !broken ? (
            <Image
              src={avatarUrl}
              alt=""
              width={px}
              height={px}
              unoptimized
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center font-bold text-white"
              style={{
                background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
                fontSize: px * 0.36,
              }}
              aria-hidden
            >
              {initial}
            </span>
          )}
        </span>
      </span>
      {live ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#0B1220] bg-[#22C55E]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        </span>
      ) : null}
    </span>
  );
}
