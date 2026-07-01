"use client";

import type { ReactNode } from "react";
import { Switch } from "@/shared/ui/switch";
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

const SWITCH_CONTROL_CLASS: Record<MentrixaSwitchTone, string> = {
  light:
    "h-6 w-11 shrink-0 border-transparent bg-indigo-100 shadow-none data-[state=checked]:bg-indigo-600 [&>span]:h-5 [&>span]:w-5 [&>span]:translate-x-0.5 data-[state=checked]:[&>span]:translate-x-5",
  dark:
    "h-6 w-11 shrink-0 border border-slate-700 bg-slate-800 shadow-none data-[state=checked]:border-transparent data-[state=checked]:bg-indigo-600 [&>span]:h-5 [&>span]:w-5 [&>span]:translate-x-0.5 data-[state=checked]:[&>span]:translate-x-5",
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
    <div className={cn("mentrixa-switch", TONE_CLASS[tone], className)}>
      <div className="mentrixa-switch__content">
        <div className="mentrixa-switch__text min-w-0 flex-1">
          <span className="mentrixa-switch__label">{label}</span>
          <span className="mentrixa-switch__description">{description}</span>
        </div>
        <Switch
          checked={isSelected}
          onCheckedChange={onChange}
          disabled={isDisabled}
          aria-label={label}
          className={SWITCH_CONTROL_CLASS[tone]}
        />
      </div>
      {showFooter ? (
        <p className="mentrixa-switch__footer">
          {resolvedVerdict ? <span>{resolvedVerdict} </span> : null}
          {resolvedNextAction ? <span className="opacity-90">{resolvedNextAction}</span> : null}
        </p>
      ) : null}
    </div>
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
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "mentrixa-switch-group",
        TONE_CLASS[tone],
        layout === "grid" ? "mentrixa-switch-group--grid" : "mentrixa-switch-group--stack",
        className,
      )}
    >
      {children}
    </div>
  );
}
