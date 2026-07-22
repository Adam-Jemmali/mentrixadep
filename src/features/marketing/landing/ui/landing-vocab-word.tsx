"use client";

import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { LandingRoleIcon, landingRoleFromLabel, type LandingRole } from "@/features/marketing/landing/ui/landing-role-icon";
import { isSingleWordLabel, landingWordVocabIcon } from "@/features/marketing/landing/ui/landing-word-vocab-pure";
import { cn } from "@/shared/core/utils";

const ICON_PX = { md: 26, lg: 32, xl: 38 } as const;

/** Single-word sticky label with a large readable vocab or role icon. */
export function LandingVocabWord({
  word,
  icon,
  role,
  size = "lg",
  className,
  prefix,
  gold,
  surface = "light",
}: {
  word: string;
  icon?: VocabIconName;
  role?: LandingRole;
  size?: keyof typeof ICON_PX;
  className?: string;
  prefix?: string;
  gold?: boolean;
  surface?: "light" | "dark";
}) {
  const iconPx = ICON_PX[size];
  const resolvedRole = role ?? landingRoleFromLabel(word);
  const vocab = icon ?? landingWordVocabIcon(word);

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {resolvedRole ? (
        <LandingRoleIcon role={resolvedRole} size={size === "xl" ? "lg" : "md"} surface={surface} />
      ) : (
        <LandingStickyNote
          compact
          variant="strip"
          className={cn(
            "flex shrink-0 items-center justify-center p-1 shadow-none",
            size === "xl" ? "h-12 w-12" : size === "lg" ? "h-11 w-11" : "h-10 w-10",
          )}
        >
          <MentrixaVocabIcon
            name={vocab}
            size={iconPx}
            surface={surface}
            title={word}
            gold={gold ?? vocab === "verified"}
          />
        </LandingStickyNote>
      )}
      <span className={landingHub.stickyWord}>
        {prefix ? <span className="mr-1.5 tabular-nums text-[#6366F1]">{prefix}</span> : null}
        {word}
      </span>
    </span>
  );
}

/** Nav / compact single-word label with a smaller icon. */
export function LandingNavWord({
  label,
  surface = "dark",
  className,
}: {
  label: string;
  surface?: "light" | "dark";
  className?: string;
}) {
  const role = landingRoleFromLabel(label);
  const vocab =
    label === "Live Arena"
      ? ("arena" as const)
      : isSingleWordLabel(label)
        ? landingWordVocabIcon(label)
        : null;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {role ? (
        <LandingRoleIcon role={role} size="sm" surface={surface} />
      ) : vocab ? (
        <MentrixaVocabIcon name={vocab} size={18} surface={surface} title={label} />
      ) : null}
      {label}
    </span>
  );
}
