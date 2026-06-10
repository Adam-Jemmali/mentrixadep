"use client";

import Image from "next/image";
import { BookOpen, Flame, Shield, Trophy, Users, Zap } from "lucide-react";
import { cn } from "@/shared/core/utils";

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

const sizePx = { sm: 36, md: 56, lg: 96 };

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

  const containerClasses = cn(
    "relative shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300",
    size === "lg" ? "rounded-[1.5rem]" : size === "md" ? "rounded-xl" : "rounded-lg",
    "bg-slate-50 text-slate-200",
    className
  );

  if (avatarKind === "custom" && avatarUrl) {
    return (
      <div
        className={containerClasses}
        style={{ width: px, height: px }}
      >
        <Image
          src={avatarUrl}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full rounded-[inherit]"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={containerClasses}
      style={{ width: px, height: px }}
      title={name}
    >
      <Icon
        className={cn(
          size === "lg" ? "h-10 w-10" : size === "sm" ? "h-4 w-4" : "h-6 w-6"
        )}
        strokeWidth={1}
      />
      <span className="sr-only">{name}</span>
    </div>
  );
}


