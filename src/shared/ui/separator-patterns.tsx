"use client";

import { Children, Fragment, type ReactNode } from "react";
import { Separator } from "@/shared/ui/hero-separator";
import { cn } from "@/shared/core/utils";
import {
  mentrixaSeparatorAriaLabel,
  type MentrixaSeparatorSurface,
} from "@/shared/ui/separator-messages-pure";

export type MentrixaSeparatorTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaSeparatorTone, string> = {
  light: "mentrixa-separator--light",
  dark: "mentrixa-separator--dark",
};

export function MentrixaSeparator({
  tone = "light",
  variant = "tertiary",
  orientation = "horizontal",
  surface,
  className,
}: {
  tone?: MentrixaSeparatorTone;
  variant?: "default" | "secondary" | "tertiary";
  orientation?: "horizontal" | "vertical";
  surface?: MentrixaSeparatorSurface;
  className?: string;
}) {
  return (
    <Separator
      orientation={orientation}
      variant={variant}
      aria-label={surface ? mentrixaSeparatorAriaLabel(surface) : undefined}
      className={cn("mentrixa-separator", TONE_CLASS[tone], className)}
    />
  );
}

/** Dense list rows with subtle dividers instead of divide-y borders. */
export function MentrixaSeparatorStack({
  children,
  tone = "light",
  variant = "tertiary",
  surface = "dashboard",
  className,
}: {
  children: ReactNode;
  tone?: MentrixaSeparatorTone;
  variant?: "default" | "secondary" | "tertiary";
  surface?: MentrixaSeparatorSurface;
  className?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <div className={cn("mentrixa-separator-stack", className)}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < items.length - 1 ? (
            <MentrixaSeparator tone={tone} variant={variant} surface={surface} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

/** Section break on dark settings shells. */
export function MentrixaSettingsSectionDivider({ className }: { className?: string }) {
  return (
    <MentrixaSeparator
      tone="dark"
      variant="tertiary"
      surface="settings"
      className={cn("my-8", className)}
    />
  );
}
