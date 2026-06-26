"use client";

import type { Key, ReactNode } from "react";
import { Tabs } from "@/shared/ui/hero-tabs";
import { cn } from "@/shared/core/utils";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";

export type MentrixaTabsTone = "light" | "dark" | "workbench";

const TONE_CLASS: Record<MentrixaTabsTone, string> = {
  light: "mentrixa-tabs--light",
  dark: "mentrixa-tabs--dark",
  workbench: "mentrixa-tabs--workbench",
};

export type MentrixaTabItem = {
  id: string;
  label: string;
  badge?: ReactNode;
  isDisabled?: boolean;
  panel: ReactNode;
  verdict?: string;
  nextAction?: string;
};

export function MentrixaTabsGroup({
  items,
  ariaLabel,
  tone = "light",
  variant = "secondary",
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  brandKind,
  className,
  listClassName,
  panelClassName,
  suppressPanelFooter = false,
}: {
  items: MentrixaTabItem[];
  ariaLabel: string;
  tone?: MentrixaTabsTone;
  variant?: "primary" | "secondary";
  selectedKey?: Key;
  defaultSelectedKey?: Key;
  onSelectionChange?: (key: Key) => void;
  brandKind?: MentrixaBrandKind;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
  suppressPanelFooter?: boolean;
}) {
  return (
    <Tabs
      variant={variant}
      selectedKey={selectedKey as any}
      defaultSelectedKey={defaultSelectedKey as any}
      onSelectionChange={onSelectionChange as any}
      className={cn("mentrixa-tabs w-full", TONE_CLASS[tone], className)}
    >
      <Tabs.ListContainer className="mentrixa-tabs__list-container flex items-center gap-2">
        {brandKind ? (
          <span className="mentrixa-tabs__brand hidden shrink-0 sm:inline-flex">
            <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-85" />
          </span>
        ) : null}
        <Tabs.List aria-label={ariaLabel} className={cn("mentrixa-tabs__list min-w-0 flex-1", listClassName)}>
          {items.map((item, index) => (
            <Tabs.Tab
              key={item.id}
              id={item.id}
              isDisabled={item.isDisabled}
              className="mentrixa-tabs__tab"
            >
              {index > 0 ? <Tabs.Separator className="mentrixa-tabs__separator" /> : null}
              <span className="inline-flex items-center gap-2">
                {item.label}
                {item.badge}
              </span>
              <Tabs.Indicator className="mentrixa-tabs__indicator" />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>

      {items.map((item) => (
        <Tabs.Panel key={item.id} id={item.id} className={cn("mentrixa-tabs__panel", panelClassName)}>
          <div className="mentrixa-tabs__panel-body">{item.panel}</div>
          {!suppressPanelFooter && (item.verdict || item.nextAction) ? (
            <p className="mentrixa-tabs__footer mt-4 text-xs leading-relaxed">
              {item.verdict ? <span>{item.verdict} </span> : null}
              {item.nextAction ? <span className="opacity-90">{item.nextAction}</span> : null}
            </p>
          ) : null}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
