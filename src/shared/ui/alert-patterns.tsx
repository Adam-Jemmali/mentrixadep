"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/shared/core/utils";
import { Alert } from "@/shared/ui/hero-alert";
import { Button } from "@/shared/ui/button";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import {
  practiceLockedAttemptAlertMessage,
  practiceWrongAnswerAlertMessage,
  subscriptionAlertMessage,
  verifiedFirstAttemptAlertMessage,
  type MentrixaAlertMessage,
  type MentrixaAlertStatus,
  type SubscriptionAlertKind,
  type VerifiedFirstAttemptAlertKind,
} from "@/shared/ui/alert-messages-pure";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";

export type MentrixaAlertTone = "light" | "dark";

const TONE_CLASS: Record<MentrixaAlertTone, string> = {
  light: "mentrixa-alert--light",
  dark: "mentrixa-alert--dark",
};

const STATUS_CLASS: Record<MentrixaAlertStatus, string> = {
  default: "mentrixa-alert--default",
  accent: "mentrixa-alert--accent",
  success: "mentrixa-alert--success",
  warning: "mentrixa-alert--warning",
  danger: "mentrixa-alert--danger",
};

export function MentrixaAlert({
  status,
  title,
  description,
  nextAction,
  tone = "light",
  brandKind = "mentrixer",
  showBrandIndicator = true,
  action,
  className,
}: {
  status: MentrixaAlertStatus;
  title: string;
  description?: ReactNode;
  nextAction?: string;
  tone?: MentrixaAlertTone;
  brandKind?: MentrixaBrandKind;
  showBrandIndicator?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Alert
      status={status}
      className={cn(
        "mentrixa-alert",
        TONE_CLASS[tone],
        STATUS_CLASS[status],
        className,
      )}
    >
      <Alert.Indicator>
        {showBrandIndicator ? (
          <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-90" />
        ) : null}
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {description ? <Alert.Description>{description}</Alert.Description> : null}
        {nextAction ? (
          <p className="mentrixa-alert__next-action text-sm leading-relaxed">{nextAction}</p>
        ) : null}
        {action}
      </Alert.Content>
    </Alert>
  );
}

function MentrixaAlertFromMessage({
  message,
  tone = "light",
  brandKind = "mentrixer",
  action,
  className,
}: {
  message: MentrixaAlertMessage;
  tone?: MentrixaAlertTone;
  brandKind?: MentrixaBrandKind;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <MentrixaAlert
      status={message.status}
      title={message.title}
      description={message.description}
      nextAction={message.nextAction}
      tone={tone}
      brandKind={brandKind}
      action={action}
      className={className}
    />
  );
}

export function VerifiedFirstAttemptAlert({
  kind,
  subjectLabel,
  tone = "light",
  className,
  signupHref = "/auth/signup",
}: {
  kind: VerifiedFirstAttemptAlertKind;
  subjectLabel: string;
  tone?: MentrixaAlertTone;
  className?: string;
  signupHref?: string;
}) {
  const message = verifiedFirstAttemptAlertMessage(kind, subjectLabel);

  if (kind === "guest_preview") {
    return (
      <MentrixaAlert
        status={message.status}
        title={message.title}
        description={message.description}
        tone={tone}
        brandKind="mentrixer"
        className={className}
        action={
          <p className="mentrixa-alert__next-action text-sm leading-relaxed">
            <Link
              href={signupHref}
              className="font-semibold text-indigo-700 underline underline-offset-2"
            >
              Sign up free
            </Link>{" "}
            to save your permanent rank.
          </p>
        }
      />
    );
  }

  return (
    <MentrixaAlertFromMessage
      message={message}
      tone={tone}
      brandKind="mentrixer"
      className={className}
    />
  );
}

export function SubscriptionStateAlert({
  kind,
  error,
  tone = "light",
  className,
}: {
  kind: SubscriptionAlertKind;
  error?: string;
  tone?: MentrixaAlertTone;
  className?: string;
}) {
  return (
    <MentrixaAlertFromMessage
      message={subscriptionAlertMessage(kind, error)}
      tone={tone}
      brandKind="mentrixa"
      className={className}
    />
  );
}

export function PracticeWrongAnswerAlert({
  explanation,
  onContinue,
  continueLabel = "Next question",
  busy = false,
  className,
}: {
  explanation: string;
  onContinue?: () => void;
  continueLabel?: string;
  busy?: boolean;
  className?: string;
}) {
  const message = practiceWrongAnswerAlertMessage(explanation);

  return (
    <MentrixaAlert
      status={message.status}
      title={message.title}
      description={<PromptWithMath text={explanation} variant="dark" />}
      nextAction={onContinue ? message.nextAction : undefined}
      tone="dark"
      brandKind="mentrixer"
      showBrandIndicator={false}
      className={className}
      action={
        onContinue ? (
          <Button
            type="button"
            className={`mt-3 ${mentrixBrandUi.heroBtn}`}
            onClick={onContinue}
            disabled={busy}
          >
            {continueLabel}
          </Button>
        ) : null
      }
    />
  );
}

export function PracticeLockedAttemptAlert({ className }: { className?: string }) {
  return (
    <MentrixaAlertFromMessage
      message={practiceLockedAttemptAlertMessage()}
      tone="light"
      brandKind="mentrixer"
      className={className}
    />
  );
}

export function isPracticeLockedAttemptError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /locked|first attempt only/i.test(message);
}
