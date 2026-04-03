"use client";

import Image from "next/image";
import { BookOpen, Flame, Shield, Trophy, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  book: BookOpen,
  flame: Flame,
  trophy: Trophy,
  users: Users,
  zap: Zap,
};

type Props = {
  name: string;
  avatarKind: "preset" | "custom";
  presetKey: string | null;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizePx = { sm: 36, md: 48, lg: 72 };

export function ClanAvatarBadge({
  name,
  avatarKind,
  presetKey,
  avatarUrl,
  size = "md",
  className,
}: Props) {
  const px = sizePx[size];
  const pk = (presetKey && PRESET_ICONS[presetKey] ? presetKey : "shield") as string;
  const Icon = PRESET_ICONS[pk] ?? Shield;

  if (avatarKind === "custom" && avatarUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100",
          className
        )}
        style={{ width: px, height: px }}
      >
        <Image
          src={avatarUrl}
          alt=""
          width={px}
          height={px}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-700",
        className
      )}
      style={{ width: px, height: px }}
      title={name}
    >
      <Icon
        className={
          size === "lg" ? "h-9 w-9" : size === "sm" ? "h-4 w-4" : "h-6 w-6"
        }
      />
      <span className="sr-only">{name}</span>
    </div>
  );
}
