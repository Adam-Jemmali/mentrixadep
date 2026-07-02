"use client";

import type { Key, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion } from "@/shared/ui/hero-accordion";
import { cn } from "@/shared/core/utils";

export type MentrixaAccordionTone = "light" | "dark" | "marketing";

const TONE_CLASS: Record<MentrixaAccordionTone, string> = {
  light: "mentrixa-accordion--light",
  dark: "mentrixa-accordion--dark",
  marketing: "mentrixa-accordion--marketing",
};

export function MentrixaAccordion({
  children,
  tone = "light",
  variant = "surface",
  allowsMultipleExpanded,
  defaultExpandedKeys,
  expandedKeys,
  onExpandedChange,
  hideSeparator,
  className,
}: {
  children: ReactNode;
  tone?: MentrixaAccordionTone;
  variant?: "default" | "surface";
  allowsMultipleExpanded?: boolean;
  defaultExpandedKeys?: Iterable<Key>;
  expandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  hideSeparator?: boolean;
  className?: string;
}) {
  return (
    <Accordion
      variant={variant}
      allowsMultipleExpanded={allowsMultipleExpanded}
      defaultExpandedKeys={defaultExpandedKeys as any}
      expandedKeys={expandedKeys as any}
      onExpandedChange={onExpandedChange as any}
      hideSeparator={hideSeparator}
      className={cn("mentrixa-accordion", TONE_CLASS[tone], className)}
    >
      {children}
    </Accordion>
  );
}

export function MentrixaAccordionItem({
  id,
  title,
  meta,
  leadingIcon,
  children,
  verdict,
  nextAction,
  isDisabled,
  className,
}: {
  id: string;
  title: string;
  meta?: string;
  leadingIcon?: ReactNode;
  children: ReactNode;
  verdict?: string;
  nextAction?: string;
  isDisabled?: boolean;
  className?: string;
}) {
  return (
    <Accordion.Item id={id} isDisabled={isDisabled} className={cn("mentrixa-accordion__item", className)}>
      <Accordion.Heading>
        <Accordion.Trigger className="mentrixa-accordion__trigger">
          {leadingIcon ? <span className="mr-2 shrink-0 self-start pt-0.5">{leadingIcon}</span> : null}
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold leading-snug">{title}</span>
            {meta ? (
              <span className="mt-0.5 block text-[11px] font-medium text-inherit opacity-70">{meta}</span>
            ) : null}
          </span>
          <Accordion.Indicator className="mentrixa-accordion__indicator">
            <ChevronDown className="size-4" aria-hidden />
          </Accordion.Indicator>
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="mentrixa-accordion__body">
          <div className="space-y-3 text-sm leading-relaxed">{children}</div>
          {verdict || nextAction ? (
            <p className="mentrixa-accordion__footer mt-3 text-xs leading-relaxed">
              {verdict ? <span>{verdict} </span> : null}
              {nextAction ? <span className="opacity-90">{nextAction}</span> : null}
            </p>
          ) : null}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
