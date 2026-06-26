"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MentrixaAvatarBadge } from "@/shared/ui/badge-patterns";
import { badgeCountAriaLabel } from "@/shared/ui/badge-messages-pure";

export function NavProfileAvatar({
  avatarUrl,
  initials,
  badgeCount = 0,
  badgeNoun = "pending review",
}: {
  avatarUrl: string | null | undefined;
  initials: string;
  badgeCount?: number;
  badgeNoun?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  const avatar =
    avatarUrl && !broken ? (
      <Image
        src={avatarUrl}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="h-8 w-8 shrink-0 rounded-full border border-white/15 object-cover"
        onError={() => setBroken(true)}
      />
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
        {initials}
      </div>
    );

  return (
    <MentrixaAvatarBadge
      count={badgeCount}
      color="danger"
      countLabel={badgeCount > 0 ? badgeCountAriaLabel(badgeCount, badgeNoun) : undefined}
    >
      {avatar}
    </MentrixaAvatarBadge>
  );
}
