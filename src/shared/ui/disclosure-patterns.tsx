"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Disclosure } from "@/shared/ui/hero-disclosure";
import { cn } from "@/shared/core/utils";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import {
  examStakesDisclosureMessage,
  guideDemandSignalDisclosureMessage,
  guideImpactDisclosureMessage,
  mentrixaDisclosureMessage,
  momentumSubscriptionDisclosureMessage,
  verifiedFirstAttemptDisclosureMessage,
  type MentrixaDisclosureKind,
  type MentrixaDisclosureMessage,
} from "@/shared/ui/disclosure-messages-pure";

export type MentrixaDisclosureTone = "light" | "dark" | "marketing";

const TONE_CLASS: Record<MentrixaDisclosureTone, string> = {
  light: "mentrixa-disclosure--light",
  dark: "mentrixa-disclosure--dark",
  marketing: "mentrixa-disclosure--marketing",
};

export function MentrixaDisclosure({
  triggerLabel,
  children,
  verdict,
  nextAction,
  tone = "light",
  brandKind,
  isExpanded,
  onExpandedChange,
  className,
  bodyClassName,
}: {
  triggerLabel: string;
  children: ReactNode;
  verdict?: string;
  nextAction?: string;
  tone?: MentrixaDisclosureTone;
  brandKind?: MentrixaBrandKind;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Disclosure
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      className={cn("mentrixa-disclosure", TONE_CLASS[tone], className)}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="mentrixa-disclosure__trigger">
          {brandKind ? (
            <MentrixaBrandMark kind={brandKind} size="xs" className="shrink-0 opacity-85" />
          ) : null}
          <span className="min-w-0 flex-1 text-left text-sm font-medium leading-snug">{triggerLabel}</span>
          <Disclosure.Indicator className="mentrixa-disclosure__indicator">
            <ChevronDown className="size-4" aria-hidden />
          </Disclosure.Indicator>
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className={cn("mentrixa-disclosure__body", bodyClassName)}>
          <div className="text-sm leading-relaxed">{children}</div>
          {verdict || nextAction ? (
            <p className="mentrixa-disclosure__footer mt-3 text-xs leading-relaxed">
              {verdict ? <span>{verdict} </span> : null}
              {nextAction ? <span className="opacity-90">{nextAction}</span> : null}
            </p>
          ) : null}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

function MentrixaDisclosureFromMessage({
  message,
  tone = "light",
  brandKind,
  className,
}: {
  message: MentrixaDisclosureMessage;
  tone?: MentrixaDisclosureTone;
  brandKind?: MentrixaBrandKind;
  className?: string;
}) {
  return (
    <MentrixaDisclosure
      triggerLabel={message.triggerLabel}
      verdict={message.verdict}
      nextAction={message.nextAction}
      tone={tone}
      brandKind={brandKind}
      className={className}
    >
      <p>{message.body}</p>
    </MentrixaDisclosure>
  );
}

export function VerifiedFirstAttemptDisclosure({
  subjectLabel,
  tone = "light",
  className,
}: {
  subjectLabel: string;
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  return (
    <MentrixaDisclosureFromMessage
      message={verifiedFirstAttemptDisclosureMessage(subjectLabel)}
      tone={tone}
      brandKind="mentrixer"
      className={className}
    />
  );
}

export function GuideImpactDisclosure({
  tone = "light",
  className,
}: {
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  return (
    <MentrixaDisclosureFromMessage
      message={guideImpactDisclosureMessage()}
      tone={tone}
      brandKind="guide"
      className={className}
    />
  );
}

export function GuideDemandSignalDisclosure({
  tone = "light",
  className,
}: {
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  return (
    <MentrixaDisclosureFromMessage
      message={guideDemandSignalDisclosureMessage()}
      tone={tone}
      brandKind="guide"
      className={className}
    />
  );
}

export function MomentumSubscriptionDisclosure({
  tone = "light",
  className,
}: {
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  return (
    <MentrixaDisclosureFromMessage
      message={momentumSubscriptionDisclosureMessage()}
      tone={tone}
      brandKind="mentrixa"
      className={className}
    />
  );
}

export function ExamStakesDisclosure({
  examStakes,
  tone = "light",
  className,
}: {
  examStakes: string;
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  return (
    <MentrixaDisclosureFromMessage
      message={examStakesDisclosureMessage(examStakes)}
      tone={tone}
      brandKind="mentrixer"
      className={className}
    />
  );
}

export function WhyThisMattersDisclosure({
  kind,
  subjectLabel,
  examStakes,
  tone = "light",
  className,
}: {
  kind: MentrixaDisclosureKind;
  subjectLabel?: string;
  examStakes?: string;
  tone?: MentrixaDisclosureTone;
  className?: string;
}) {
  const message = mentrixaDisclosureMessage(kind, { subjectLabel, examStakes });
  const brandKind: MentrixaBrandKind =
    kind === "guide_impact" || kind === "guide_demand_signal"
      ? "guide"
      : kind === "momentum_subscription"
        ? "mentrixa"
        : "mentrixer";

  return (
    <MentrixaDisclosureFromMessage
      message={message}
      tone={tone}
      brandKind={brandKind}
      className={className}
    />
  );
}
