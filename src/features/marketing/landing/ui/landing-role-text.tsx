"use client";

import { Fragment } from "react";
import { LandingRoleIcon, landingRoleFromLabel, type LandingRole } from "@/features/marketing/landing/ui/landing-role-icon";

const ROLE_RE = /\b(Guides?|Mentrixers?)\b/g;

function matchRole(word: string): LandingRole | null {
  if (/^guides?$/i.test(word)) return "guide";
  if (/^mentrixers?$/i.test(word)) return "mentrixer";
  return null;
}

/** Inline Mentrixer / Guide mentions with role SVG beside each word. */
export function LandingRoleText({
  text,
  className,
  iconSize = "sm",
  surface = "light",
}: {
  text: string;
  className?: string;
  iconSize?: "sm" | "md" | "lg" | "xl";
  surface?: "light" | "dark";
}) {
  const parts = text.split(ROLE_RE);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const role = matchRole(part);
        if (role) {
          return (
            <Fragment key={`${index}-${part}`}>
              <LandingRoleIcon
                role={role}
                size={iconSize}
                surface={surface}
                className="mx-0.5 inline-flex align-[-0.2em]"
              />
              {part}
            </Fragment>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
}

export { landingRoleFromLabel };
