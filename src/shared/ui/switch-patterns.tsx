"use client";

import type { ReactNode } from "react";
import { Switch, SwitchGroup, Description } from "@/shared/ui/hero-switch";
import { cn } from "@/shared/core/utils";
import {
  settingsSwitchMessage,
  type MentrixaSettingsSwitchId,
} from "@/shared/ui/switch-messages-pure";

export type MentrixaSwitchTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaSwitchTone, string> = {
  light: "mentrixa-switch--light",
  dark: "mentrixa-switch--dark",
};

export function MentrixaSettingsSwitch({
  label,
  description,
  isSelected,
  onChange,
  settingId,
  isTutor,
  tone = "light",
  isDisabled,
  className,
  suppressFooter = false,
  verdict,
  nextAction,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
  settingId?: MentrixaSettingsSwitchId;
  isTutor?: boolean;
  tone?: MentrixaSwitchTone;
  isDisabled?: boolean;
  className?: string;
  suppressFooter?: boolean;
  verdict?: string;
  nextAction?: string;
}) {
  const message = settingId ? settingsSwitchMessage(settingId, { isTutor }) : null;
  const resolvedVerdict = verdict ?? message?.verdict;
  const resolvedNextAction = nextAction ?? message?.nextAction;
  const showFooter = !suppressFooter && (resolvedVerdict || resolvedNextAction);

  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cn("mentrixa-switch", TONE_CLASS[tone], className)}
    >
      <Switch.Content className="mentrixa-switch__content">
        <div className="mentrixa-switch__text min-w-0 flex-1">
          <span className="mentrixa-switch__label">{label}</span>
          <Description className="mentrixa-switch__description">{description}</Description>
        </div>
        <Switch.Control className="mentrixa-switch__control shrink-0">
          <Switch.Thumb className="mentrixa-switch__thumb" />
        </Switch.Control>
      </Switch.Content>
      {showFooter ? (
        <p className="mentrixa-switch__footer">
          {resolvedVerdict ? <span>{resolvedVerdict} </span> : null}
          {resolvedNextAction ? <span className="opacity-90">{resolvedNextAction}</span> : null}
        </p>
      ) : null}
    </Switch>
  );
}

export function MentrixaSettingsSwitchGroup({
  children,
  ariaLabel,
  tone = "light",
  layout = "stack",
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  tone?: MentrixaSwitchTone;
  layout?: "stack" | "grid";
  className?: string;
}) {
  return (
    <SwitchGroup
      aria-label={ariaLabel}
      className={cn(
        "mentrixa-switch-group",
        TONE_CLASS[tone],
        layout === "grid" ? "mentrixa-switch-group--grid" : "mentrixa-switch-group--stack",
        className,
      )}
    >
      {children}
    </SwitchGroup>
  );
}
