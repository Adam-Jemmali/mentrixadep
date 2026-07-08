"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { arenaAvatarAccent, arenaAvatarInitial } from "@/features/live-board/live-board-avatar-pure";
import { cn } from "@/shared/core/utils";

const SIZE_PX = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
} as const;

type Size = keyof typeof SIZE_PX;

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  avatarInitial?: string;
  size?: Size;
  className?: string;
};

export function ArenaPersonAvatar({
  displayName,
  avatarUrl,
  avatarInitial,
  size = "md",
  className,
}: Props) {
  const [broken, setBroken] = useState(false);
  const px = SIZE_PX[size];
  const accent = arenaAvatarAccent(displayName);
  const initial = (avatarInitial ?? arenaAvatarInitial(displayName)).toUpperCase();

  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  if (avatarUrl && !broken) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={px}
        height={px}
        unoptimized
        className={cn(
          "shrink-0 rounded-full border border-[#C4B5FD] bg-white object-cover",
          className,
        )}
        style={{ width: px, height: px }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-[#C4B5FD] font-bold text-white",
        className,
      )}
      style={{
        width: px,
        height: px,
        fontSize: px * 0.38,
        background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
